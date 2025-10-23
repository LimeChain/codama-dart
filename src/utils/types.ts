import {
    ArrayTypeNode,
    camelCase,
    DefinedTypeLinkNode,
    DefinedTypeNode,
    EnumTypeNode,
    EnumVariantTypeNode,
    FixedSizeTypeNode,
    Node,
    NumberTypeNode,
    OptionTypeNode,
    resolveNestedTypeNode,
    SizePrefixTypeNode,
    TypeNode,
} from '@codama/nodes';

import { getBEnumAnnotation } from '../fragments/enumType';
import { NameApi } from './nameTransformers';

// Constants for hardcoded values
const DEFAULT_PUBLIC_KEY = '11111111111111111111111111111111';
const SOLANA_PUBLIC_KEY_SIZE = 32;

export interface TypeInfo {
    dartType: string;
    defaultValue: string;
    imports: string[];
    serializationSize?: number;
}

export function getTypeInfo(typeNode: TypeNode, nameApi: NameApi, allDefinedTypes: DefinedTypeNode[]): TypeInfo {
    switch (typeNode.kind) {
        case 'numberTypeNode':
            return getNumberTypeInfo(typeNode);
        case 'booleanTypeNode':
            return getBooleanTypeInfo();
        case 'stringTypeNode':
            return getStringTypeInfo();
        case 'bytesTypeNode':
            return getBytesTypeInfo();
        case 'arrayTypeNode':
            return getArrayTypeInfo(typeNode, nameApi, allDefinedTypes);
        case 'optionTypeNode':
            return getOptionTypeInfo(typeNode, nameApi, allDefinedTypes);
        case 'publicKeyTypeNode':
            return getPublicKeyTypeInfo();
        case 'fixedSizeTypeNode':
            return getFixedSizeTypeInfo(typeNode, nameApi, allDefinedTypes);
        case 'solAmountTypeNode':
            return getAmountTypeInfo();
        case 'definedTypeLinkNode':
            return getDefinedTypeLinkTypeInfo(typeNode, nameApi.definedType(typeNode.name), allDefinedTypes);
        case 'sizePrefixTypeNode':
            return getSizePrefixTypeInfo(typeNode);
        default:
            return {
                dartType: 'Object',
                defaultValue: 'Object()',
                imports: [],
            };
    }
}

function getNumberTypeInfo(node: NumberTypeNode): TypeInfo {
    const { format } = node;

    const numberTypeMap: Record<string, { dartType: string; defaultValue: string; serializationSize: number }> = {
        f32: { dartType: 'double', defaultValue: '0.0', serializationSize: 4 },
        f64: { dartType: 'double', defaultValue: '0.0', serializationSize: 8 },
        i128: { dartType: 'BigInt', defaultValue: 'BigInt.zero', serializationSize: 16 },
        i16: { dartType: 'int', defaultValue: '0', serializationSize: 2 },
        i32: { dartType: 'int', defaultValue: '0', serializationSize: 4 },
        i64: { dartType: 'BigInt', defaultValue: 'BigInt.zero', serializationSize: 8 },
        i8: { dartType: 'int', defaultValue: '0', serializationSize: 1 },
        u128: { dartType: 'BigInt', defaultValue: 'BigInt.zero', serializationSize: 16 },
        u16: { dartType: 'int', defaultValue: '0', serializationSize: 2 },
        u32: { dartType: 'int', defaultValue: '0', serializationSize: 4 },
        u64: { dartType: 'BigInt', defaultValue: 'BigInt.zero', serializationSize: 8 },
        u8: { dartType: 'int', defaultValue: '0', serializationSize: 1 },
    };

    const typeInfo = numberTypeMap[format];
    if (typeInfo) {
        return {
            ...typeInfo,
            imports: [],
        };
    }

    return {
        dartType: 'num',
        defaultValue: '0',
        imports: [],
    };
}

function getBooleanTypeInfo(): TypeInfo {
    return {
        dartType: 'bool',
        defaultValue: 'false',
        imports: [],
        serializationSize: 1,
    };
}

function getStringTypeInfo(): TypeInfo {
    return {
        dartType: 'String',
        defaultValue: "''",
        imports: [],
    };
}

function getBytesTypeInfo(): TypeInfo {
    return {
        dartType: 'Uint8List',
        defaultValue: 'Uint8List(0)',
        imports: [],
    };
}

function getArrayTypeInfo(
    node: ArrayTypeNode,
    nameApi: NameApi,

    allDefinedTypes: DefinedTypeNode[],
): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi, allDefinedTypes);

    if (node.count && node.count.kind === 'fixedCountNode') {
        const size = node.count.value;
        return {
            dartType: `List<${innerTypeInfo.dartType}>`,
            defaultValue: `List.filled(${size}, ${innerTypeInfo.defaultValue})`,
            imports: innerTypeInfo.imports,
            serializationSize: size,
        };
    }

    return {
        dartType: `List<${innerTypeInfo.dartType}>`,
        defaultValue: 'const []',
        imports: innerTypeInfo.imports,
    };
}

function getOptionTypeInfo(node: OptionTypeNode, nameApi: NameApi, allDefinedTypes: DefinedTypeNode[]): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi, allDefinedTypes);

    return {
        dartType: `${innerTypeInfo.dartType}?`,
        defaultValue: 'null',
        imports: innerTypeInfo.imports,
    };
}

function getPublicKeyTypeInfo(): TypeInfo {
    return {
        dartType: 'Ed25519HDPublicKey',
        defaultValue: `Ed25519HDPublicKey.fromBase58("${DEFAULT_PUBLIC_KEY}")`,
        imports: [],
        serializationSize: SOLANA_PUBLIC_KEY_SIZE,
    };
}

function getFixedSizeTypeInfo(node: FixedSizeTypeNode, nameApi: NameApi, allDefinedTypes: DefinedTypeNode[]): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.type);

    if (resolvedType.kind === 'bytesTypeNode') {
        return {
            dartType: 'Uint8List',
            defaultValue: `Uint8List(${node.size})`,
            imports: [],
            serializationSize: node.size,
        };
    }

    const innerTypeInfo = getTypeInfo(resolvedType, nameApi, allDefinedTypes);

    return {
        dartType: `List<${innerTypeInfo.dartType}>`,
        defaultValue: `List.filled(${node.size}, ${innerTypeInfo.defaultValue})`,
        imports: innerTypeInfo.imports,
        serializationSize: node.size,
    };
}

function getAmountTypeInfo(): TypeInfo {
    return {
        dartType: 'BigInt',
        defaultValue: 'BigInt.zero',
        imports: [],
        serializationSize: 8,
    };
}

function stripAnnotationPrefix(annotation: string): string {
    return annotation.replace('@', '');
}

export function getBorshAnnotation(typeNode: Node, nameApi: NameApi, allDefinedTypes: DefinedTypeNode[]): string {
    switch (typeNode.kind) {
        case 'numberTypeNode': {
            const numberFormat = (typeNode as NumberTypeNode).format;
            switch (numberFormat) {
                case 'u8':
                    return '@BU8()';
                case 'i8':
                    return '@BI8()';
                case 'u16':
                    return '@BU16()';
                case 'i16':
                    return '@BI16()';
                case 'u32':
                    return '@BU32()';
                case 'i32':
                    return '@BI32()';
                case 'u64':
                    return '@BU64()';
                case 'i64':
                    return '@BI64()';
                case 'u128':
                    return '@BU128()';
                case 'i128':
                    return '@BI128()';
                case 'f32':
                    return '@BF32()';
                case 'f64':
                    return '@BF64()';
                default:
                    return '@BU8()'; // fallback
            }
        }
        case 'booleanTypeNode':
            return '@BBool()';
        case 'stringTypeNode':
            return '@BString()';
        case 'bytesTypeNode':
            return '@BBytes()';
        case 'publicKeyTypeNode':
            return '@BPublicKey()';
        case 'fixedSizeTypeNode': {
            const resolvedType = resolveNestedTypeNode(typeNode.type);

            if (resolvedType.kind === 'bytesTypeNode') {
                return `@BFixedBytes(${typeNode.size})`;
            }

            const innerAnnotation = getBorshAnnotation(resolvedType, nameApi, allDefinedTypes);
            return `@BFixedArray(${typeNode.size}, ${stripAnnotationPrefix(innerAnnotation)})`;
        }
        case 'arrayTypeNode': {
            const arrayInnerAnnotation = getBorshAnnotation(typeNode.item, nameApi, allDefinedTypes);

            if (typeNode.count && typeNode.count.kind === 'fixedCountNode') {
                const size = typeNode.count.value;
                return `@BFixedArray(${size}, ${stripAnnotationPrefix(arrayInnerAnnotation)})`;
            }

            return `@BArray(${stripAnnotationPrefix(arrayInnerAnnotation)})`;
        }
        case 'optionTypeNode': {
            const optionResolvedType = resolveNestedTypeNode(typeNode.item);
            const optionInnerAnnotation = getBorshAnnotation(optionResolvedType, nameApi, allDefinedTypes);
            return `@BOption(${stripAnnotationPrefix(optionInnerAnnotation)})`;
        }
        case 'definedTypeLinkNode': {
            const className = nameApi.definedType(typeNode.name);

            const resolvedType = allDefinedTypes.find(dt => dt.name === typeNode.name);
            if (resolvedType && resolvedType.type.kind === 'enumTypeNode') {
                const variants = resolvedType.type.variants || [];
                return getBEnumAnnotation(className, variants, nameApi);
            }

            return `@B${className}()`;
        }
        case 'sizePrefixTypeNode': {
            const resolvedType = resolveNestedTypeNode(typeNode.type);

            if (resolvedType.kind === 'bytesTypeNode') {
                return '@BBytes()';
            }

            return '@BString()';
        }
        default:
            return '@BArray(BU8())';
    }
}

function getDefinedTypeLinkTypeInfo(
    node: DefinedTypeLinkNode,
    className: string,
    allDefinedTypes: DefinedTypeNode[],
): TypeInfo {
    const imports: string[] = [];
    const libName = 'lib';
    const typeDefinition = allDefinedTypes.find(dt => dt.name === node.name);
    if (typeDefinition && typeDefinition.type.kind === 'enumTypeNode') {
        const enumName = camelCase(node.name);
        const enumType = typeDefinition.type as EnumTypeNode;
        const variants = enumType.variants || [];

        imports.push(`package:${libName}/types/${enumName}/${enumName}.dart`);

        variants.forEach((variant: EnumVariantTypeNode) => {
            const variantFileName = camelCase(variant.name);
            imports.push(`package:${libName}/types/${enumName}/${variantFileName}.dart`);
        });

        return {
            dartType: className,
            defaultValue: `${className}()`,
            imports,
        };
    }

    const importPath = `package:${libName}/types/${node.name}.dart`;
    return {
        dartType: className,
        defaultValue: `${className}()`,
        imports: [importPath],
    };
}

function getSizePrefixTypeInfo(node: SizePrefixTypeNode): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.type);

    if (resolvedType.kind === 'bytesTypeNode') {
        return {
            dartType: 'Uint8List',
            defaultValue: 'Uint8List(0)',
            imports: [],
        };
    }

    return {
        dartType: 'String',
        defaultValue: "''",
        imports: [],
    };
}
