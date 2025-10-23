import {
    camelCase,
    DefinedTypeNode,
    EnumStructVariantTypeNode,
    EnumTupleVariantTypeNode,
    EnumVariantTypeNode,
    resolveNestedTypeNode,
    StructFieldTypeNode,
    TypeNode,
} from '@codama/nodes';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, NameApi, RenderScope } from '../utils';

function collectVariantImports(
    variant: EnumVariantTypeNode,
    nameApi: NameApi,
    scope: Pick<RenderScope, 'definedTypes'>,
    allImports: Set<string>,
): void {
    if (variant.kind === 'enumStructVariantTypeNode') {
        const resolvedStruct = resolveNestedTypeNode(variant.struct);
        resolvedStruct.fields?.forEach((field: StructFieldTypeNode) => {
            const typeInfo = getTypeInfo(field.type, nameApi, scope.definedTypes);
            typeInfo.imports.forEach(imp => allImports.add(imp));
        });
    } else if (variant.kind === 'enumTupleVariantTypeNode') {
        const resolvedTuple = resolveNestedTypeNode(variant.tuple);
        resolvedTuple.items?.forEach((item: TypeNode) => {
            const typeInfo = getTypeInfo(item, nameApi, scope.definedTypes);
            typeInfo.imports.forEach(imp => allImports.add(imp));
        });
    }
}

export function getEnumVariantFragment(
    scope: Pick<RenderScope, 'definedTypes' | 'nameApi'> & {
        variant: EnumVariantTypeNode;
        variantName: string;
    },
): Fragment {
    const { variantName, variant, nameApi } = scope;

    const allImports = new Set(['package:borsh_annotation_extended/borsh_annotation_extended.dart']);
    collectVariantImports(variant, nameApi, scope, allImports);

    let content = '';

    switch (variant.kind) {
        case 'enumEmptyVariantTypeNode':
            content = generateEmptyVariantAsStruct(variantName);
            break;
        case 'enumTupleVariantTypeNode':
            content = generateTupleVariantAsStruct(variantName, variant, nameApi, scope);
            break;
        case 'enumStructVariantTypeNode':
            content = generateStructVariantAsStruct(variantName, variant, nameApi, scope);
            break;
    }

    return createFragment(content, Array.from(allImports));
}

export function getEnumMainFragment(
    scope: Pick<RenderScope, 'definedTypes' | 'nameApi'> & {
        name: string;
        node: DefinedTypeNode;
    },
): Fragment {
    const { name, node, nameApi } = scope;

    if (node.type.kind !== 'enumTypeNode') {
        throw new Error(`Expected enumTypeNode but got ${node.type.kind}`);
    }

    const enumTypeNode = node.type;
    const className = nameApi.definedType(camelCase(name));
    const variants = enumTypeNode.variants || [];

    const allImports = new Set(['package:borsh_annotation_extended/borsh_annotation_extended.dart']);

    variants.forEach(variant => {
        const variantFileName = camelCase(variant.name);
        allImports.add(`./${variantFileName}.dart`);

        collectVariantImports(variant, nameApi, scope, allImports);
    });

    const factoryConstructors = variants
        .map((variant, index) => {
            const variantName = nameApi.definedType(camelCase(variant.name));
            const methodName = camelCase(variant.name);

            switch (variant.kind) {
                case 'enumEmptyVariantTypeNode':
                    return `  factory ${className}.${methodName}() {
    return ${className}._(${variantName}(), ${index});
  }`;
                case 'enumTupleVariantTypeNode': {
                    const resolvedTuple = resolveNestedTypeNode(variant.tuple);
                    if (!resolvedTuple.items) {
                        return `  factory ${className}.${methodName}() {
    return ${className}._(${variantName}(), ${index});
  }`;
                    }
                    const tupleParams = resolvedTuple.items
                        .map((item: TypeNode, index: number) => {
                            const typeInfo = getTypeInfo(item, nameApi, scope.definedTypes);
                            return `${typeInfo.dartType} field${index}`;
                        })
                        .join(', ');
                    const tupleArgs = resolvedTuple.items
                        .map((_: TypeNode, index: number) => `field${index}: field${index}`)
                        .join(', ');
                    return `  factory ${className}.${methodName}(${tupleParams}) {
    return ${className}._(${variantName}(${tupleArgs}), ${index});
  }`;
                }
                case 'enumStructVariantTypeNode': {
                    const resolvedStruct = resolveNestedTypeNode(variant.struct);
                    if (!resolvedStruct.fields) {
                        return `  factory ${className}.${methodName}() {
    return ${className}._(${variantName}(), ${index});
  }`;
                    }
                    const structParams = resolvedStruct.fields
                        .map((field: StructFieldTypeNode) => {
                            const typeInfo = getTypeInfo(field.type, nameApi, scope.definedTypes);
                            const fieldName = nameApi.accountField(field.name);
                            return `required ${typeInfo.dartType} ${fieldName}`;
                        })
                        .join(', ');
                    const structArgs = resolvedStruct.fields
                        .map((field: StructFieldTypeNode) => {
                            const fieldName = nameApi.accountField(field.name);
                            return `${fieldName}: ${fieldName}`;
                        })
                        .join(', ');
                    return `  factory ${className}.${methodName}({${structParams}}) {
    return ${className}._(${variantName}(${structArgs}), ${index});
  }`;
                }
                default:
                    return '';
            }
        })
        .filter(Boolean)
        .join('\n\n');

    const variantAnnotations = variants
        .map(variant => {
            const variantName = nameApi.definedType(camelCase(variant.name));
            return `${variantName}: B${variantName}()`;
        })
        .join(', ');

    const content = `// Main enum class with factory constructors for each variant
class ${className} {
  final dynamic variant;
  final int discriminant;

  const ${className}._(this.variant, this.discriminant);

${factoryConstructors}

  @override
  String toString() {
    return variant.toString();
  }

  Uint8List toBorsh() {
    final writer = BinaryWriter();
    writer.writeU8(discriminant);

    final Uint8List variantBytes = variant.toBorsh();
    for (final byte in variantBytes) {
      writer.writeU8(byte);
    }
    return writer.toArray();
  }
}

// Borsh annotation generator for use in other structs
// Usage: @BEnum<${className}>({${variantAnnotations}}) required ${className} myEnum,`;

    return createFragment(content, Array.from(allImports));
}

function generateEmptyVariantAsStruct(variantName: string): string {
    return `class ${variantName} {
  const ${variantName}();

  static ${variantName} fromBorsh(Uint8List _data) {
    return ${variantName}();
  }

  Uint8List toBorsh() {
    // Empty variant has no data to serialize
    return Uint8List(0);
  }

  @override
  String toString([int indent = 0]) {
    return '${variantName}()';
  }
}

class B${variantName} implements BType<${variantName}> {
  const B${variantName}();

  @override
  void write(BinaryWriter writer, ${variantName} value) {
    // Correct - unit variant has no data to write
  }

  @override
  ${variantName} read(BinaryReader reader) {
    // Correct - unit variant has no data to read
    return ${variantName}();
  }
}`;
}

function generateTupleVariantAsStruct(
    variantName: string,
    variant: EnumTupleVariantTypeNode,
    nameApi: NameApi,
    scope: Pick<RenderScope, 'definedTypes'>,
): string {
    const resolvedTuple = resolveNestedTypeNode(variant.tuple);
    if (!resolvedTuple.items) {
        return generateEmptyVariantAsStruct(variantName);
    }

    const params = resolvedTuple.items
        .map((item: TypeNode, index: number) => {
            const typeInfo = getTypeInfo(item, nameApi, scope.definedTypes);
            const borshAnnotation = getBorshAnnotation(item, nameApi, scope.definedTypes);
            return `    ${borshAnnotation} required ${typeInfo.dartType} field${index},`;
        })
        .join('\n');

    const toStringFields = resolvedTuple.items
        .map((_: TypeNode, index: number) => `buffer.writeln('  field${index}: $field${index}');`)
        .join('\n    ');

    return `part '${camelCase(variantName)}.g.dart';

@BorshSerializable()
class ${variantName} with _$${variantName} {
  factory ${variantName}({
${params}
  }) = _${variantName};
  

  const ${variantName}._();

  static ${variantName} fromBorsh(Uint8List data) {
    return _$${variantName}FromBorsh(data);
  }


  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${variantName}(');
    ${toStringFields}
    buffer.write(')');
    return buffer.toString();
  }
}`;
}

function generateStructVariantAsStruct(
    variantName: string,
    variant: EnumStructVariantTypeNode,
    nameApi: NameApi,
    scope: Pick<RenderScope, 'definedTypes'>,
): string {
    const resolvedStruct = resolveNestedTypeNode(variant.struct);
    if (!resolvedStruct.fields) {
        return generateEmptyVariantAsStruct(variantName);
    }

    const params = resolvedStruct.fields
        .map((field: StructFieldTypeNode) => {
            const typeInfo = getTypeInfo(field.type, nameApi, scope.definedTypes);
            const borshAnnotation = getBorshAnnotation(field.type, nameApi, scope.definedTypes);
            const fieldName = nameApi.accountField(field.name);
            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    const toStringFields = resolvedStruct.fields
        .map((field: StructFieldTypeNode) => {
            const fieldName = nameApi.accountField(field.name);
            return `buffer.writeln('  ${fieldName}: $${fieldName}');`;
        })
        .join('\n    ');

    return `part '${camelCase(variantName)}.g.dart';

@BorshSerializable()
class ${variantName} with _$${variantName} {
  factory ${variantName}({
${params}
  }) = _${variantName};
  

  const ${variantName}._();

  static ${variantName} fromBorsh(Uint8List data) {
    return _$${variantName}FromBorsh(data);
  }


  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${variantName}(');
    ${toStringFields}
    buffer.write(')');
    return buffer.toString();
  }
}`;
}

export function getBEnumAnnotation(enumName: string, variants: EnumVariantTypeNode[], nameApi: NameApi): string {
    const variantAnnotations = variants
        .map(variant => {
            const variantName = nameApi.definedType(camelCase(variant.name));
            return `${variantName}: B${variantName}()`;
        })
        .join(', ');

    return `@BEnum<${enumName}>({${variantAnnotations}})`;
}
