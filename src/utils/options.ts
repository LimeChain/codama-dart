import { CamelCaseString } from '@codama/nodes';
import { LinkableDictionary } from '@codama/visitors-core';

import { GetImportFromFunction, ImportMap } from './importMap';
import { NameApi } from './nameTransformers';

export type RenderOptions = GetRenderMapOptions & {
    deleteFolderBeforeRendering?: boolean;
    formatCode?: boolean;
};

export type GetRenderMapOptions = {
    customAccountData?: CustomDataOptions[];
    customInstructionData?: CustomDataOptions[];
    libraryName?: string;
    nameTransformers?: Partial<import('./nameTransformers').NameTransformers>;
    outputDirectory?: string;
    pubspecName?: string;
};

export type CustomDataOptions = {
    extractType: boolean;
    name: CamelCaseString;
};

export type ParsedCustomDataOptions = Map<CamelCaseString, CustomDataOptions>;

export type RenderScope = {
    // Custom data handling
    customAccountData: ParsedCustomDataOptions;
    customInstructionData: ParsedCustomDataOptions;

    getImportFrom: GetImportFromFunction;

    // Import management
    imports: ImportMap;
    // Core configuration
    libraryName: string;

    // Cross-reference systems
    linkables: LinkableDictionary;
    // Naming and transformations
    nameApi: NameApi;

    outputDirectory: string;
};

export function parseCustomDataOptions(options: CustomDataOptions[]): ParsedCustomDataOptions {
    const map = new Map<CamelCaseString, CustomDataOptions>();
    options.forEach(option => {
        map.set(option.name, option);
    });
    return map;
}
