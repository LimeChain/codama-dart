import { InstructionNode, isNode, structTypeNodeFromInstructionArgumentNodes } from '@codama/nodes';
import { findProgramNodeFromPath, getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, RenderScope } from '../utils';

export function getInstructionDataFragment(
    scope: Pick<RenderScope, 'definedTypes' | 'nameApi' | 'packageName' | 'programName'> & {
        instructionPath: NodePath<InstructionNode>;
        size: number | null;
    },
): Fragment | undefined {
    const { instructionPath, nameApi } = scope;
    const instructionNode = getLastNodeFromPath(instructionPath);

    if (instructionNode.arguments.length === 0) return;

    const instructionDataName = nameApi.instructionDataType(instructionNode.name);
    const structNode = structTypeNodeFromInstructionArgumentNodes(instructionNode.arguments);

    const programNode = findProgramNodeFromPath(instructionPath);
    const programDefinedTypes = programNode?.definedTypes || [];

    const allImports = new Set([
        'package:borsh_annotation_extended/borsh_annotation_extended.dart',
        'package:solana/encoder.dart',
    ]);

    const nonDiscriminatorFields = structNode.fields.filter(field => field.name !== 'discriminator');

    const factoryParams = nonDiscriminatorFields
        .map(field => {
            const typeInfo = getTypeInfo(field.type, { ...scope, definedTypes: programDefinedTypes });
            const borshAnnotation = getBorshAnnotation(field.type, nameApi, programDefinedTypes);
            const fieldName = nameApi.instructionField(field.name);

            typeInfo.imports.forEach(imp => allImports.add(imp));

            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    const validations = nonDiscriminatorFields
        .map(field => {
            const fieldName = nameApi.instructionField(field.name);

            if (field.type.kind === 'fixedSizeTypeNode') {
                const size = field.type.size;
                if (field.type.type.kind === 'bytesTypeNode') {
                    return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must be exactly ${size} bytes, got \${${fieldName}.length}');`;
                } else if (field.type.type.kind === 'arrayTypeNode') {
                    return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must have exactly ${size} elements, got \${${fieldName}.length}');`;
                }
            }

            if (field.type.kind === 'arrayTypeNode' && field.type.count && field.type.count.kind === 'fixedCountNode') {
                const size = field.type.count.value;
                return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must have exactly ${size} elements, got \${${fieldName}.length}');`;
            }

            return '';
        })
        .filter(v => v)
        .join('\n');

    const allValidations = validations
        ? `    if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got \${discriminator.length}');\n${validations}`
        : `    if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got \${discriminator.length}');`;

    const discriminatorBytes = (() => {
        const data = instructionNode.arguments.find(arg => arg.name === 'discriminator')?.defaultValue;
        return data && isNode(data, 'bytesValueNode')
            ? Array.from(Buffer.from(data.data, 'hex')).join(', ')
            : '0, 0, 0, 0, 0, 0, 0, 0';
    })();

    const discriminatorParam = `    @BFixedBytes(8) required Uint8List discriminator`;
    const allParams = factoryParams ? `${discriminatorParam},\n${factoryParams}` : discriminatorParam;

    const content = `part '${instructionNode.name}.g.dart';

@BorshSerializable()
class ${instructionDataName} with _$${instructionDataName} {
  static final DISCRIMINATOR = Uint8List.fromList([${discriminatorBytes}]);
  factory ${instructionDataName}({
${allParams}
  }) {
    // Validate fixed-size fields
${allValidations}
    return _${instructionDataName}(
      discriminator: discriminator,
${nonDiscriminatorFields
    .map(field => {
        const fieldName = nameApi.instructionField(field.name);
        return `      ${fieldName}: ${fieldName},`;
    })
    .join('\n')}
    );
  }
  
  ${instructionDataName}._();

  static ${instructionDataName} fromBorsh(Uint8List data) {
    return _$${instructionDataName}FromBorsh(data);
  }


  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${instructionDataName}(');
    ${structNode.fields
        .map(field => {
            const fieldName = nameApi.instructionField(field.name);
            return `buffer.writeln('  ${fieldName}: $${fieldName}');`;
        })
        .join('\n    ')}
    buffer.write(')');
    return buffer.toString();
  }
}`;

    return createFragment(content, Array.from(allImports));
}
