import { camelCase, getAllInstructionsWithSubs, getAllPrograms, isNode } from '@codama/nodes';
import { createRenderMap, mergeRenderMaps } from '@codama/renderers-core';
import {
    extendVisitor,
    findProgramNodeFromPath,
    getByteSizeVisitor,
    LinkableDictionary,
    NodeStack,
    pipe,
    recordLinkablesOnFirstVisitVisitor,
    recordNodeStackVisitor,
    staticVisitor,
    visit,
} from '@codama/visitors-core';

import {
    getAccountPageFragment,
    getErrorPageFragment,
    getInstructionPageFragment,
    getLibraryIndexFragment,
    getProgramPageFragment,
    getStructTypeFragment,
} from '../fragments';
import { Fragment, generatePubspec, getNameApi, getPageFragment, GetRenderMapOptions, RenderScope } from '../utils';
import { createInlinePdaFile } from '../utils/pda';

export function getRenderMapVisitor(options: GetRenderMapOptions) {
    const linkables = new LinkableDictionary();
    const stack = new NodeStack();

    const byteSizeVisitor = getByteSizeVisitor(linkables, { stack });
    const libraryName = options.libraryName ?? 'lib';
    const outputDirectory = options.outputDirectory;

    // Create the complete render scope
    const renderScope: RenderScope = {
        libraryName,
        nameApi: getNameApi(options.nameTransformers),
        outputDirectory,
    };

    const asPage = <TFragment extends Fragment | undefined>(
        fragment: TFragment,
        pageOptions: { libraryName?: string } = {},
    ): TFragment => {
        if (!fragment) return undefined as TFragment;
        return getPageFragment(fragment, pageOptions) as TFragment;
    };

    return pipe(
        staticVisitor(() => createRenderMap(), {
            keys: ['rootNode', 'programNode', 'pdaNode', 'accountNode', 'definedTypeNode', 'instructionNode'],
        }),
        v =>
            extendVisitor(v, {
                visitAccount(node) {
                    const size = visit(node, byteSizeVisitor);
                    return createRenderMap(
                        `${libraryName}/accounts/${camelCase(node.name)}.dart`,
                        asPage(
                            getAccountPageFragment({
                                ...renderScope,
                                accountPath: stack.getPath('accountNode'),
                                size,
                            }),
                        ),
                    );
                },

                visitDefinedType(node) {
                    if (node.type.kind === 'structTypeNode') {
                        return createRenderMap(
                            `${libraryName}/types/${camelCase(node.name)}.dart`,
                            asPage(
                                getStructTypeFragment({
                                    ...renderScope,
                                    name: node.name,
                                    node: node.type,
                                    size: visit(node, byteSizeVisitor),
                                }),
                            ),
                        );
                    }
                    return createRenderMap();
                },

                visitInstruction(node) {
                    const instructionRenderMap = createRenderMap(
                        `${libraryName}/instructions/${camelCase(node.name)}.dart`,
                        asPage(
                            getInstructionPageFragment({
                                ...renderScope,
                                instructionPath: stack.getPath('instructionNode'),
                                size: visit(node, byteSizeVisitor),
                            }),
                        ),
                    );

                    const pdaRenderMaps = new Map<string, ReturnType<typeof createRenderMap>>();

                    node.accounts.forEach(account => {
                        if (account.defaultValue?.kind !== 'pdaValueNode') {
                            return;
                        }
                        if (!isNode(account.defaultValue.pda, 'pdaNode')) {
                            return;
                        }

                        const pdaName = camelCase(account.name);

                        // Avoid duplicate PDA files for the same account name
                        if (!pdaRenderMaps.has(pdaName)) {
                            const pdaFile = createInlinePdaFile(
                                account.name,
                                account.defaultValue.pda,
                                account.defaultValue.seeds,
                                renderScope.nameApi,
                                findProgramNodeFromPath(stack.getPath('instructionNode'))?.publicKey,
                                asPage,
                            );
                            if (pdaFile) {
                                pdaRenderMaps.set(
                                    pdaName,
                                    createRenderMap(`${libraryName}/pdas/${pdaName}.dart`, pdaFile),
                                );
                            }
                        }
                    });

                    const pdaRenderMapArray = Array.from(pdaRenderMaps.values());
                    return mergeRenderMaps([instructionRenderMap, ...pdaRenderMapArray]);
                },

                visitProgram(node, { self }) {
                    return mergeRenderMaps([
                        createRenderMap({
                            [`${libraryName}/programs/${camelCase(node.name)}.dart`]: asPage(
                                getProgramPageFragment({ ...renderScope, programNode: node }),
                            ),
                            [`${libraryName}/errors/${camelCase(node.name)}.dart`]:
                                node.errors.length > 0
                                    ? asPage(getErrorPageFragment({ ...renderScope, programNode: node }))
                                    : undefined,
                        }),
                        ...node.pdas.map(p => visit(p, self)),
                        ...node.accounts.map(a => visit(a, self)),
                        ...node.definedTypes.map(t => visit(t, self)),
                        ...getAllInstructionsWithSubs(node, { leavesOnly: true }).map(i => visit(i, self)),
                    ]);
                },

                visitRoot(node, { self }) {
                    const pubspecContent = generatePubspec(libraryName, {
                        description: `Generated Dart package for Solana program interaction`,
                        version: '1.0.0',
                    });

                    return mergeRenderMaps([
                        createRenderMap({
                            [`${libraryName}/${libraryName}.dart`]: asPage(
                                getLibraryIndexFragment({
                                    ...renderScope,
                                    rootNode: node,
                                }),
                            ),
                            [`pubspec.yaml`]: pubspecContent,
                        }),
                        ...getAllPrograms(node).map(p => visit(p, self)),
                    ]);
                },
            }),
        v => recordNodeStackVisitor(v, stack),
        v => recordLinkablesOnFirstVisitVisitor(v, linkables),
    );
}
