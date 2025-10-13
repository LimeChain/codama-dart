import {
    ArrayTypeNode,
    DefinedTypeLinkNode,
    FixedSizeTypeNode,
    NumberTypeNode,
    OptionTypeNode,
    resolveNestedTypeNode,
    SizePrefixTypeNode,
    StringTypeNode,
    TypeNode,
} from '@codama/nodes';

import { NameApi } from './nameTransformers';

export interface TypeInfo {
    dartType: string;
    defaultValue: string;
    imports: string[];
    serializationSize?: number;
}

// We need RenderScope for name transformers when handling defined type links
export type TypeInfoScope = {
    nameApi: {
        definedType: (name: string) => string;
    };
};

export function getTypeInfo(typeNode: TypeNode, nameApi: NameApi): TypeInfo {
    switch (typeNode.kind) {
        case 'numberTypeNode':
            return getNumberTypeInfo(typeNode as NumberTypeNode);
        case 'booleanTypeNode':
            return getBooleanTypeInfo();
        case 'stringTypeNode':
            return getStringTypeInfo(typeNode as StringTypeNode);
        case 'bytesTypeNode':
            return getBytesTypeInfo();
        case 'arrayTypeNode':
            return getArrayTypeInfo(typeNode as ArrayTypeNode, nameApi);
        case 'optionTypeNode':
            return getOptionTypeInfo(typeNode as OptionTypeNode, nameApi);
        // case 'tupleTypeNode':
        //     return getTupleTypeInfo(typeNode as TupleTypeNode);
        case 'setTypeNode':
            return getSetTypeInfo();
        case 'mapTypeNode':
            return getMapTypeInfo();
        case 'dateTimeTypeNode':
            return getDateTimeTypeInfo();
        case 'publicKeyTypeNode':
            return getPublicKeyTypeInfo();
        // case 'structTypeNode':
        //     return getStructTypeInfo(typeNode as StructTypeNode);
        case 'fixedSizeTypeNode':
            return getFixedSizeTypeInfo(typeNode as FixedSizeTypeNode, nameApi);
        case 'solAmountTypeNode':
            return getAmountTypeInfo();
        case 'definedTypeLinkNode':
            return getDefinedTypeLinkTypeInfo(typeNode as DefinedTypeLinkNode, nameApi.definedType(typeNode.name));
        case 'sizePrefixTypeNode':
            return getSizePrefixTypeInfo(typeNode as SizePrefixTypeNode);
        default:
            // For unsupported types, return a generic object type
            console.log(`DEBUG: Unsupported type node kind: ${typeNode.kind}`, typeNode);
            return {
                dartType: 'Object',
                defaultValue: 'Object()',
                imports: [],
            };
    }
}

function getNumberTypeInfo(node: NumberTypeNode): TypeInfo {
    const { format } = node;

    // Map Codama number formats to Dart types
    switch (format) {
        case 'u8':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 1,
            };
        case 'u16':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 2,
            };
        case 'u32':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 4,
            };
        case 'u64':
            return {
                dartType: 'BigInt',
                defaultValue: 'BigInt.zero',
                imports: [],
                serializationSize: 8,
            };
        case 'u128':
            return {
                dartType: 'BigInt',
                defaultValue: 'BigInt.zero',
                imports: [],
                serializationSize: 16,
            };
        case 'i8':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 1,
            };
        case 'i16':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 2,
            };
        case 'i32':
            return {
                dartType: 'int',
                defaultValue: '0',
                imports: [],
                serializationSize: 4,
            };
        case 'i64':
            return {
                dartType: 'BigInt',
                defaultValue: 'BigInt.zero',
                imports: [],
                serializationSize: 8,
            };
        case 'i128':
            return {
                dartType: 'BigInt',
                defaultValue: 'BigInt.zero',
                imports: [],
                serializationSize: 16,
            };
        case 'f32':
            return {
                dartType: 'double',
                defaultValue: '0.0',
                imports: [],
                serializationSize: 4,
            };
        case 'f64':
            return {
                dartType: 'double',
                defaultValue: '0.0',
                imports: [],
                serializationSize: 8,
            };
        default:
            return {
                dartType: 'num',
                defaultValue: '0',
                imports: [],
            };
    }
}

function getBooleanTypeInfo(): TypeInfo {
    return {
        dartType: 'bool',
        defaultValue: 'false',
        imports: [],
        serializationSize: 1,
    };
}

function getStringTypeInfo(_node: StringTypeNode): TypeInfo {
    return {
        dartType: 'String',
        defaultValue: "''",
        imports: [],
        // Variable size - will need length prefix
    };
}

function getBytesTypeInfo(): TypeInfo {
    return {
        dartType: 'Uint8List',
        defaultValue: 'Uint8List(0)',
        imports: [],
        // Variable size - will need length prefix
    };
}

function getArrayTypeInfo(node: ArrayTypeNode, nameApi: NameApi): TypeInfo {
    // Resolve the nested type to get the actual item type
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi);

    // Check if this is a fixed-size array
    if (node.count && node.count.kind === 'fixedCountNode') {
        const size = node.count.value;
        return {
            dartType: `List<${innerTypeInfo.dartType}>`,
            defaultValue: `List.filled(${size}, ${innerTypeInfo.defaultValue})`,
            imports: innerTypeInfo.imports,
            serializationSize: size, // Mark as fixed size
        };
    }

    return {
        dartType: `List<${innerTypeInfo.dartType}>`,
        defaultValue: 'const []',
        imports: innerTypeInfo.imports,
        // Variable size
    };
}

function getOptionTypeInfo(node: OptionTypeNode, nameApi: NameApi): TypeInfo {
    // Resolve the nested type to get the actual inner type
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, nameApi);

    // Dart doesn't have built-in Option, we'll use nullable types
    return {
        dartType: `${innerTypeInfo.dartType}?`,
        defaultValue: 'null',
        imports: innerTypeInfo.imports,
        // Variable size depending on content
    };
}

// function getTupleTypeInfo(_node: TupleTypeNode): TypeInfo {
//     // Dart doesn't have built-in tuples, we'll use List

//     return {
//         dartType: 'List<Object>',
//         defaultValue: 'const []',
//         imports: [],
//     };
// }

function getSetTypeInfo(): TypeInfo {
    return {
        dartType: 'Set<Object>',
        defaultValue: 'const {}',
        imports: [],
    };
}

function getMapTypeInfo(): TypeInfo {
    return {
        dartType: 'Map<Object, Object>',
        defaultValue: 'const {}',
        imports: [],
    };
}

function getDateTimeTypeInfo(): TypeInfo {
    return {
        dartType: 'DateTime',
        defaultValue: 'DateTime.now()',
        imports: [],
        serializationSize: 8, // Usually stored as timestamp
    };
}

function getPublicKeyTypeInfo(): TypeInfo {
    return {
        dartType: 'Ed25519HDPublicKey',
        defaultValue: 'Ed25519HDPublicKey.fromBase58("11111111111111111111111111111111")',
        imports: ['package:solana/solana.dart'],
        serializationSize: 32, // Solana public keys are 32 bytes
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

// function getStructTypeInfo(node: StructTypeNode): TypeInfo {
//     // For struct types, we need to generate a custom class
//     // This is a placeholder - the actual class generation happens in fragments
//     // We return a generic name that will be replaced with the actual class name
//     return {
//         dartType: 'Object', // Will be replaced with actual struct class name
//         defaultValue: 'Object()', // Will be replaced with actual constructor
//         imports: [],
//         // Size depends on the fields - calculated elsewhere
//     };
// }

function getAmountTypeInfo(): TypeInfo {
    return {
        dartType: 'BigInt',
        defaultValue: 'BigInt.zero',
        imports: [],
        serializationSize: 8,
    };
}

export function generateDartSerialization(typeInfo: TypeInfo, fieldName: string): string {
    const { dartType, serializationSize } = typeInfo;

    if (dartType === 'bool') {
        return `// TODO: Handle BigInt serialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType === 'int' && serializationSize) {
        return `// TODO: Handle BigInt serialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType === 'double' && serializationSize) {
        return `// TODO: Handle ${serializationSize}-byte float serialization for ${fieldName}`;
    }

    if (dartType === 'BigInt' && serializationSize) {
        return `// TODO: Handle BigInt serialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType === 'String' && serializationSize === 32) {
        return `// TODO: Handle PublicKey serialization for ${fieldName} (32 bytes)`;
    }

    if (dartType === 'String') {
        return `// TODO: Handle String serialization for ${fieldName}`;
    }

    if (dartType === 'Uint8List') {
        return `// TODO: Handle Uint8List serialization for ${fieldName}`;
    }

    if (dartType === 'List<int>' && serializationSize) {
        return `// TODO: Handle fixed-size byte array serialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType.startsWith('List<') || dartType.startsWith('Set<') || dartType.startsWith('Map<')) {
        return `// TODO: Handle collection serialization for ${fieldName}`;
    }

    return `// TODO: Handle serialization for ${fieldName} of type ${dartType}`;
}

export function getBorshAnnotation(typeNode: TypeNode, nameApi: NameApi): string {
    switch (typeNode.kind) {
        case 'numberTypeNode': {
            const numberFormat = (typeNode as NumberTypeNode).format;
            switch (numberFormat) {
                case 'u8':
                case 'i8':
                    return '@BU8()';
                case 'u16':
                case 'i16':
                    return '@BU16()';
                case 'u32':
                case 'i32':
                    return '@BU32()';
                case 'u64':
                case 'i64':
                    return '@BU64()';
                case 'u128':
                case 'i128':
                    return '@BU128()';
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
            return '@BPublicKey()'; // Use custom BPublicKey annotation
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
            // Don't resolve nested types here - pass the original item type to getBorshAnnotation
            const arrayInnerAnnotation = getBorshAnnotation(arrayNode.item, nameApi);

            // Check if this is a fixed-size array
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
            return `@BCustom(B${className}())`;
        }
        case 'sizePrefixTypeNode': {
            const sizePrefixNode = typeNode as SizePrefixTypeNode;
            const resolvedType = resolveNestedTypeNode(sizePrefixNode.type);

            // If it's bytes with size prefix, use BBytes (variable length bytes with u32 prefix)
            if (resolvedType.kind === 'bytesTypeNode') {
                return '@BBytes()';
            }

            // For other size-prefixed types (like strings), use BString
            return '@BString()';
        }
        default:
            return '@BArray(BU8())'; // fallback for unsupported types
    }
}

export function generateDartDeserialization(typeInfo: TypeInfo, fieldName: string): string {
    const { dartType, serializationSize } = typeInfo;

    if (dartType === 'bool') {
        return `${fieldName} = data.getUint8(offset) != 0; offset += 1;`;
    }

    if (dartType === 'int' && serializationSize) {
        switch (serializationSize) {
            case 1:
                return `${fieldName} = data.getUint8(offset); offset += 1;`;
            case 2:
                return `${fieldName} = data.getUint16(offset, Endian.little); offset += 2;`;
            case 4:
                return `${fieldName} = data.getUint32(offset, Endian.little); offset += 4;`;
            default:
                return `// TODO: Handle ${serializationSize}-byte integer deserialization for ${fieldName}`;
        }
    }

    if (dartType === 'double' && serializationSize) {
        switch (serializationSize) {
            case 4:
                return `${fieldName} = data.getFloat32(offset, Endian.little); offset += 4;`;
            case 8:
                return `${fieldName} = data.getFloat64(offset, Endian.little); offset += 8;`;
            default:
                return `// TODO: Handle ${serializationSize}-byte float deserialization for ${fieldName}`;
        }
    }

    if (dartType === 'BigInt' && serializationSize) {
        return `// TODO: Handle BigInt deserialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType === 'String' && serializationSize === 32) {
        return `// TODO: Handle PublicKey deserialization for ${fieldName} (32 bytes)`;
    }

    if (dartType === 'String') {
        return `// TODO: Handle String deserialization for ${fieldName}`;
    }

    if (dartType === 'Uint8List') {
        return `// TODO: Handle Uint8List deserialization for ${fieldName}`;
    }

    if (dartType === 'List<int>' && serializationSize) {
        return `// TODO: Handle fixed-size byte array deserialization for ${fieldName} (${serializationSize} bytes)`;
    }

    if (dartType.startsWith('List<')) {
        return `// TODO: Handle List deserialization for ${fieldName}`;
    }

    return `// TODO: Handle deserialization for ${fieldName} of type ${dartType}`;
}

function getDefinedTypeLinkTypeInfo(node: DefinedTypeLinkNode, className: string): TypeInfo {
    // Generate import path for the custom type
    // Assuming types are in '../types/' directory relative to accounts
    const importPath = `../types/${node.name}.dart`;

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
