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
    VariablePdaSeedNode,
} from '@codama/nodes';

import { getBEnumAnnotation } from '../fragments/enumType';
import { NameApi } from './nameTransformers';
import { RenderScope } from './options';

// Constants for hardcoded values
const DEFAULT_PUBLIC_KEY = '11111111111111111111111111111111';
const SOLANA_PUBLIC_KEY_SIZE = 32;

export interface TypeInfo {
    dartType: string;
    defaultValue: string;
    imports: string[];
    serializationSize?: number;
}

export function getTypeInfo(typeNode: TypeNode, scope: RenderScope): TypeInfo {
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
            return getArrayTypeInfo(typeNode, scope);
        case 'optionTypeNode':
            return getOptionTypeInfo(typeNode, scope);
        case 'publicKeyTypeNode':
            return getPublicKeyTypeInfo();
        case 'fixedSizeTypeNode':
            return getFixedSizeTypeInfo(typeNode, scope);
        case 'solAmountTypeNode':
            return getAmountTypeInfo();
        case 'definedTypeLinkNode':
            return getDefinedTypeLinkTypeInfo(
                typeNode,
                scope.nameApi.definedType(typeNode.name),
                scope.definedTypes,
                scope.packageName,
                scope.programName,
            );
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

function getArrayTypeInfo(node: ArrayTypeNode, scope: RenderScope): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, scope);

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

function getOptionTypeInfo(node: OptionTypeNode, scope: RenderScope): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.item);
    const innerTypeInfo = getTypeInfo(resolvedType, scope);

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

function getFixedSizeTypeInfo(node: FixedSizeTypeNode, scope: RenderScope): TypeInfo {
    const resolvedType = resolveNestedTypeNode(node.type);

    if (resolvedType.kind === 'bytesTypeNode') {
        return {
            dartType: 'Uint8List',
            defaultValue: `Uint8List(${node.size})`,
            imports: [],
            serializationSize: node.size,
        };
    }

    const innerTypeInfo = getTypeInfo(resolvedType, scope);

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
    packageName: string,
    programName: string,
): TypeInfo {
    const imports: string[] = [];
    const typeDefinition = allDefinedTypes.find(dt => dt.name === node.name);
    if (typeDefinition && typeDefinition.type.kind === 'enumTypeNode') {
        const enumName = camelCase(node.name);
        const enumType = typeDefinition.type as EnumTypeNode;
        const variants = enumType.variants || [];

        imports.push(`package:${packageName}/${programName}/types/${enumName}/${enumName}.dart`);

        variants.forEach((variant: EnumVariantTypeNode) => {
            const variantFileName = camelCase(variant.name);
            imports.push(`package:${packageName}/${programName}/types/${enumName}/${variantFileName}.dart`);
        });

        return {
            dartType: className,
            defaultValue: `${className}()`,
            imports,
        };
    }

    const importPath = `package:${packageName}/${programName}/types/${node.name}.dart`;
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

export function generateDartSeedSerializationCode(seed: VariablePdaSeedNode, nameApi: NameApi): string {
    const argType = seed.type;
    const fieldName = nameApi.instructionField(seed.name);

    return generateSerializationForType(argType, fieldName);
}

function generateSerializationForType(typeNode: TypeNode, fieldName: string): string {
    switch (typeNode.kind) {
        case 'sizePrefixTypeNode':
        case 'fixedSizeTypeNode':
            return generateSerializationForType(resolveNestedTypeNode(typeNode.type), fieldName);

        case 'stringTypeNode':
            return `Uint8List.fromList(utf8.encode(${fieldName}))`;

        case 'bytesTypeNode':
            return fieldName;

        case 'numberTypeNode': {
            const numberType = typeNode as NumberTypeNode;
            return `(() {
            final extWriter = ExtendedBinaryWriter.fromBinaryWriter(BinaryWriter());
            extWriter.write${numberType.format.toUpperCase()}(${fieldName});
            return extWriter.toArray();
            })()`;
        }

        case 'publicKeyTypeNode':
            return `${fieldName}.bytes`;

        default:
            return `${fieldName}.toBorsh()`;
    }
}
