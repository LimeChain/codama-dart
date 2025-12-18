import { DefinedTypeNode } from '@codama/nodes';

import { NameApi } from './nameTransformers';

export type RenderOptions = GetRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    formatCode?: boolean;
    generateBorsh?: boolean;
};

export type GetRenderMapOptions = {
    enableWorkspace?: boolean;
    nameTransformers?: Partial<import('./nameTransformers').NameTransformers>;
    workspaceOutDir?: string;
};

export type RenderScope = {
    definedTypes: DefinedTypeNode[];
    nameApi: NameApi;
    packageName: string;
    programName: string;
};
