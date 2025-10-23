import {
    camelCase,
    DefinedTypeNode,
    EnumTypeNode,
    EnumVariantTypeNode,
    getAllInstructionsWithSubs,
    getAllPrograms,
    isNode,
} from '@codama/nodes';
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
    getEnumMainFragment,
    getEnumVariantFragment,
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
    const libraryName = 'lib';
    const byteSizeVisitor = getByteSizeVisitor(linkables, { stack });

    const getProgramDefinedTypes = (): DefinedTypeNode[] => {
        try {
            const programNode = findProgramNodeFromPath(stack.getPath('definedTypeNode'));
            return programNode?.definedTypes || [];
        } catch {
            return [];
        }
    };

    const renderScope: RenderScope = {
        definedTypes: getProgramDefinedTypes(),
        nameApi: getNameApi(options.nameTransformers),
    };

    const asPage = <TFragment extends Fragment | undefined>(fragment: TFragment): TFragment => {
        if (!fragment) return undefined as TFragment;
        return getPageFragment(fragment) as TFragment;
    };

    const visitEnumType = (enumNode: DefinedTypeNode, programDefinedTypes: DefinedTypeNode[]) => {
        const enumType = enumNode.type as EnumTypeNode;
        const variants = enumType.variants || [];
        const enumName = camelCase(enumNode.name);
        const enumRenderScope = { ...renderScope, definedTypes: programDefinedTypes };

        const variantRenderMaps = variants.map((variant: EnumVariantTypeNode) => {
            switch (variant.kind) {
                case 'enumEmptyVariantTypeNode':
                    return visitEnumEmptyVariantType(variant, enumName, enumRenderScope);
                case 'enumStructVariantTypeNode':
                    return visitEnumStructVariantType(variant, enumName, enumRenderScope);
                case 'enumTupleVariantTypeNode':
                    return visitEnumTupleVariantType(variant, enumName, enumRenderScope);
                default:
                    return createRenderMap();
            }
        });

        const mainEnumRenderMap = createRenderMap(
            `${libraryName}/types/${enumName}/${enumName}.dart`,
            asPage(
                getEnumMainFragment({
                    ...enumRenderScope,
                    name: enumNode.name,
                    node: enumNode,
                }),
            ),
        );

        return mergeRenderMaps([mainEnumRenderMap, ...variantRenderMaps]);
    };

    const visitEnumEmptyVariantType = (variant: EnumVariantTypeNode, enumName: string, scope: RenderScope) => {
        const variantName = renderScope.nameApi.definedType(camelCase(variant.name));
        const variantFileName = camelCase(variant.name);

        return createRenderMap(
            `${libraryName}/types/${enumName}/${variantFileName}.dart`,
            asPage(
                getEnumVariantFragment({
                    ...scope,
                    variant,
                    variantName,
                }),
            ),
        );
    };

    const visitEnumStructVariantType = (variant: EnumVariantTypeNode, enumName: string, scope: RenderScope) => {
        const variantName = renderScope.nameApi.definedType(camelCase(variant.name));
        const variantFileName = camelCase(variant.name);

        return createRenderMap(
            `${libraryName}/types/${enumName}/${variantFileName}.dart`,
            asPage(
                getEnumVariantFragment({
                    ...scope,
                    variant,
                    variantName,
                }),
            ),
        );
    };

    const visitEnumTupleVariantType = (variant: EnumVariantTypeNode, enumName: string, scope: RenderScope) => {
        const variantName = renderScope.nameApi.definedType(camelCase(variant.name));
        const variantFileName = camelCase(variant.name);

        return createRenderMap(
            `${libraryName}/types/${enumName}/${variantFileName}.dart`,
            asPage(
                getEnumVariantFragment({
                    ...scope,
                    variant,
                    variantName,
                }),
            ),
        );
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
                    const programDefinedTypes = getProgramDefinedTypes();

                    if (node.type.kind === 'structTypeNode') {
                        return createRenderMap(
                            `${libraryName}/types/${camelCase(node.name)}.dart`,
                            asPage(
                                getStructTypeFragment({
                                    ...renderScope,
                                    definedTypes: programDefinedTypes,
                                    name: node.name,
                                    node: node.type,
                                    size: visit(node, byteSizeVisitor),
                                }),
                            ),
                        );
                    } else if (node.type.kind === 'enumTypeNode') {
                        return visitEnumType(node, programDefinedTypes);
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
                        const programNode = findProgramNodeFromPath(stack.getPath('instructionNode'));

                        // Avoid duplicate PDA files for the same account name
                        if (!pdaRenderMaps.has(pdaName)) {
                            const pdaFile = createInlinePdaFile(
                                account.name,
                                account.defaultValue.pda,
                                account.defaultValue.seeds,
                                renderScope.nameApi,
                                programNode?.publicKey,
                                programNode?.name,
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
                    const programRenderScope = { ...renderScope, definedTypes: node.definedTypes };

                    return mergeRenderMaps([
                        createRenderMap({
                            [`${libraryName}/programs/${camelCase(node.name)}.dart`]: asPage(
                                getProgramPageFragment({ ...programRenderScope, programNode: node }),
                            ),
                            [`${libraryName}/errors/${camelCase(node.name)}.dart`]:
                                node.errors.length > 0
                                    ? asPage(getErrorPageFragment({ ...programRenderScope, programNode: node }))
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
