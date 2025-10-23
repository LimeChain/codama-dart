import { DefinedTypeNode } from '@codama/nodes';

import { NameApi } from './nameTransformers';

export type RenderOptions = GetRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    formatCode?: boolean;
    generateBorsh?: boolean;
};

export type GetRenderMapOptions = {
    nameTransformers?: Partial<import('./nameTransformers').NameTransformers>;
};

export type RenderScope = {
    definedTypes: DefinedTypeNode[];
    nameApi: NameApi;
};
