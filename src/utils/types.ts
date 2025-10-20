import {
    ArrayTypeNode,
    DefinedTypeLinkNode,
    FixedSizeTypeNode,
    NumberTypeNode,
    OptionTypeNode,
    resolveNestedTypeNode,
    SizePrefixTypeNode,
    TypeNode,
} from '@codama/nodes';

import { NameApi } from './nameTransformers';

// Constants for hardcoded values
const DEFAULT_PUBLIC_KEY = '11111111111111111111111111111111';
const TYPES_IMPORT_PREFIX = '../types/';
const SOLANA_PUBLIC_KEY_SIZE = 32;

export interface TypeInfo {
    dartType: string;
    defaultValue: string;
    imports: string[];
    serializationSize?: number;
}

export function getTypeInfo(typeNode: TypeNode, nameApi: NameApi): TypeInfo {
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
            return getArrayTypeInfo(typeNode, nameApi);
        case 'optionTypeNode':
            return getOptionTypeInfo(typeNode, nameApi);
        case 'publicKeyTypeNode':
            return getPublicKeyTypeInfo();
        case 'fixedSizeTypeNode':
            return getFixedSizeTypeInfo(typeNode, nameApi);
        case 'solAmountTypeNode':
            return getAmountTypeInfo();
        case 'definedTypeLinkNode':
            return getDefinedTypeLinkTypeInfo(typeNode, nameApi.definedType(typeNode.name));
        case 'sizePrefixTypeNode':
            return getSizePrefixTypeInfo(typeNode);
        default:
            // For unsupported types, return a generic object type
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

function getArrayTypeInfo(node: ArrayTypeNode, nameApi: NameApi): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi);

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

function getOptionTypeInfo(node: OptionTypeNode, nameApi: NameApi): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi);

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
        imports: ['package:solana/solana.dart'],
        serializationSize: SOLANA_PUBLIC_KEY_SIZE,
    };
}

function getFixedSizeTypeInfo(node: FixedSizeTypeNode, nameApi: NameApi): TypeInfo {
    // Resolve the nested type to get the actual inner type
    const resolvedType = resolveNestedTypeNode(node.type);

    // Special case: fixed-size byte arrays should be Uint8List
    if (resolvedType.kind === 'bytesTypeNode') {
        return {
            dartType: 'Uint8List',
            defaultValue: `Uint8List(${node.size})`,
            imports: [],
            serializationSize: node.size,
        };
    }

    const innerTypeInfo = getTypeInfo(resolvedType, nameApi);

    // For other fixed-size arrays, create List<innerType>
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

export function getBorshAnnotation(typeNode: TypeNode, nameApi: NameApi): string {
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
            const fixedNode = typeNode as FixedSizeTypeNode;
            const resolvedType = resolveNestedTypeNode(fixedNode.type);

            if (resolvedType.kind === 'bytesTypeNode') {
                return `@BFixedBytes(${fixedNode.size})`;
            }

            const innerAnnotation = getBorshAnnotation(resolvedType, nameApi);
            return `@BFixedArray(${fixedNode.size}, ${innerAnnotation.replace('@', '')})`;
        }
        case 'arrayTypeNode': {
            const arrayNode = typeNode as ArrayTypeNode;
            const arrayInnerAnnotation = getBorshAnnotation(arrayNode.item, nameApi);

            if (arrayNode.count && arrayNode.count.kind === 'fixedCountNode') {
                const size = arrayNode.count.value;
                return `@BFixedArray(${size}, ${arrayInnerAnnotation.replace('@', '')})`;
            }

            return `@BArray(${arrayInnerAnnotation.replace('@', '')})`;
        }
        case 'optionTypeNode': {
            const optionNode = typeNode as OptionTypeNode;
            const optionResolvedType = resolveNestedTypeNode(optionNode.item);
            const optionInnerAnnotation = getBorshAnnotation(optionResolvedType, nameApi);
            return `@BOption(${optionInnerAnnotation.replace('@', '')})`;
        }
        case 'definedTypeLinkNode': {
            const definedTypeNode = typeNode as DefinedTypeLinkNode;
            const className = nameApi.definedType(definedTypeNode.name);
            return `@B${className}()`;
        }
        case 'sizePrefixTypeNode': {
            const sizePrefixNode = typeNode as SizePrefixTypeNode;
            const resolvedType = resolveNestedTypeNode(sizePrefixNode.type);

            if (resolvedType.kind === 'bytesTypeNode') {
                return '@BBytes()';
            }

            return '@BString()';
        }
        default:
            return '@BArray(BU8())';
    }
}

function getDefinedTypeLinkTypeInfo(node: DefinedTypeLinkNode, className: string): TypeInfo {
    // Generate import path for the custom type
    const importPath = `${TYPES_IMPORT_PREFIX}${node.name}.dart`;

    return {
        dartType: className,
        defaultValue: `${className}()`, // Assumes a default constructor
        imports: [importPath],
    };
}

function getSizePrefixTypeInfo(node: SizePrefixTypeNode): TypeInfo {
    // Resolve the nested type to see what we're prefixing
    const resolvedType = resolveNestedTypeNode(node.type);

    // If it's bytes, return Uint8List
    if (resolvedType.kind === 'bytesTypeNode') {
        return {
            dartType: 'Uint8List',
            defaultValue: 'Uint8List(0)',
            imports: [],
        };
    }

    // For other size-prefixed types, default to String (like prefixed strings)
    return {
        dartType: 'String',
        defaultValue: "''",
        imports: [],
    };
}
