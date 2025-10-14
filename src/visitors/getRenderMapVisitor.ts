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
import {
    createImportMap,
    Fragment,
    generatePubspec,
    getImportFromFactory,
    getNameApi,
    getPageFragment,
    GetRenderMapOptions,
    parseCustomDataOptions,
    RenderScope,
} from '../utils';
import { createInlinePdaFile } from '../utils/pda';

export function getRenderMapVisitor(options: GetRenderMapOptions = {}) {
    const linkables = new LinkableDictionary();
    const stack = new NodeStack();

    const byteSizeVisitor = getByteSizeVisitor(linkables, { stack });
    const libraryName = options.libraryName ?? 'lib';
    const outputDirectory = options.outputDirectory ?? 'lib';

    // Create the complete render scope
    const renderScope: RenderScope = {
        customAccountData: parseCustomDataOptions(options.customAccountData ?? [], 'AccountData'),
        customInstructionData: parseCustomDataOptions(options.customInstructionData ?? [], 'InstructionData'),
        getImportFrom: getImportFromFactory(),
        imports: createImportMap(),
        libraryName,
        linkables,
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
                        `${outputDirectory}/accounts/${camelCase(node.name)}.dart`,
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
                            `${outputDirectory}/types/${camelCase(node.name)}.dart`,
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
                    // TODO: Implement other defined type fragments
                    return createRenderMap();
                },

                visitInstruction(node) {
                    const instructionRenderMap = createRenderMap(
                        `${outputDirectory}/instructions/${camelCase(node.name)}.dart`,
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
                                    createRenderMap(`${outputDirectory}/pdas/${pdaName}.dart`, pdaFile),
                                );
                            }
                        }
                    });

                    const pdaRenderMapArray = Array.from(pdaRenderMaps.values());
                    return mergeRenderMaps([instructionRenderMap, ...pdaRenderMapArray]);
                },

                // visitPda(node) {
                //     return createRenderMap(
                //         `${outputDirectory}/pdas/${camelCase(node.name)}.dart`,
                //         asPage(
                //             getPdaPageFragment({
                //                 ...renderScope,
                //                 pdaPath: stack.getPath('pdaNode'),
                //             }),
                //         ),
                //     );
                // },

                visitProgram(node, { self }) {
                    return mergeRenderMaps([
                        createRenderMap({
                            [`${outputDirectory}/programs/${camelCase(node.name)}.dart`]: asPage(
                                getProgramPageFragment({ ...renderScope, programNode: node }),
                            ),
                            [`${outputDirectory}/errors/${camelCase(node.name)}.dart`]:
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
                            [`${outputDirectory}/${libraryName}.dart`]: asPage(
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
