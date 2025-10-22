import { camelCase, CamelCaseString } from '@codama/nodes';

export type NameTransformers = {
    // Variable/field names
    accountField: (name: CamelCaseString) => string;
    // Function names
    accountFunction: (name: CamelCaseString) => string;
    // Class and type names
    accountType: (name: CamelCaseString) => string;
    definedType: (name: CamelCaseString) => string;
    errorConstant: (name: CamelCaseString) => string;
    errorType: (name: CamelCaseString) => string;

    instructionDataType: (name: CamelCaseString) => string;
    instructionField: (name: CamelCaseString) => string;
    instructionFunction: (name: CamelCaseString) => string;

    instructionType: (name: CamelCaseString) => string;
    pdaFunction: (name: CamelCaseString) => string;

    // Constants
    programConstant: (name: CamelCaseString) => string;
    // Error-specific names
    programErrorClass: (name: CamelCaseString) => string;

    programType: (name: CamelCaseString) => string;
};

export const DEFAULT_NAME_TRANSFORMERS: NameTransformers = {
    // Fields use camelCase
    accountField: name => camelCase(name),

    // Functions use camelCase
    accountFunction: name => `${camelCase(name)}Account`,

    // Classes use PascalCase
    accountType: name => pascalCase(name),

    definedType: name => pascalCase(name),

    errorConstant: name => constantCase(name),

    errorType: name => `${pascalCase(name)}Error`,

    instructionDataType: name => `${pascalCase(name)}InstructionData`,

    instructionField: name => camelCase(name),

    instructionFunction: name => `${camelCase(name)}Instruction`,

    instructionType: name => `${pascalCase(name)}Instruction`,
    pdaFunction: name => `derive${pascalCase(name)}Pda`,

    // Constants use UPPER_CASE
    programConstant: name => constantCase(name),

    // Error-specific names
    programErrorClass: name => `${pascalCase(name)}Errors`,

    programType: name => `${pascalCase(name)}Program`,
};

export type NameApi = NameTransformers;

export function getNameApi(transformers: Partial<NameTransformers> = {}): NameApi {
    return { ...DEFAULT_NAME_TRANSFORMERS, ...transformers };
}

export function pascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + camelCase(str).slice(1);
}

function constantCase(str: string): string {
    return camelCase(str)
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase();
}
