import { NameApi } from './nameTransformers';

export type RenderOptions = GetRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    formatCode?: boolean;
    generateBorsh?: boolean;
};

export type GetRenderMapOptions = {
    libraryName?: string;
    nameTransformers?: Partial<import('./nameTransformers').NameTransformers>;
    outputDirectory: string;
};

export type RenderScope = {
    libraryName: string;
    nameApi: NameApi;
    outputDirectory: string;
};
