import { InstructionNode, isNode, structTypeNodeFromInstructionArgumentNodes } from '@codama/nodes';
import { getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, RenderScope } from '../utils';

export function getInstructionDataFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        instructionPath: NodePath<InstructionNode>;
        size: number | null;
    },
): Fragment | undefined {
    const { instructionPath, nameApi } = scope;
    const instructionNode = getLastNodeFromPath(instructionPath);

    // Skip if no arguments
    if (instructionNode.arguments.length === 0) return;

    const instructionDataName = nameApi.instructionDataType(instructionNode.name);
    const structNode = structTypeNodeFromInstructionArgumentNodes(instructionNode.arguments);

    // Generate factory constructor parameters with Borsh annotations (excluding discriminator)
    const factoryParams = structNode.fields
        .filter(field => field.name !== 'discriminator') // Exclude discriminator field
        .map(field => {
            const typeInfo = getTypeInfo(field.type, nameApi);
            const borshAnnotation = getBorshAnnotation(field.type, nameApi);
            const fieldName = nameApi.instructionField(field.name);
            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    // Generate validation for fixed-size fields (excluding discriminator to avoid duplication)
    const validations = structNode.fields
        .filter(field => field.name !== 'discriminator')
        .map(field => {
            const fieldName = nameApi.instructionField(field.name);

            // Handle fixedSizeTypeNode
            if (field.type.kind === 'fixedSizeTypeNode') {
                const size = field.type.size;
                if (field.type.type.kind === 'bytesTypeNode') {
                    return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must be exactly ${size} bytes, got \${${fieldName}.length}');`;
                } else if (field.type.type.kind === 'arrayTypeNode') {
                    return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must have exactly ${size} elements, got \${${fieldName}.length}');`;
                }
            }

            // Handle arrayTypeNode with fixed count
            if (field.type.kind === 'arrayTypeNode' && field.type.count && field.type.count.kind === 'fixedCountNode') {
                const size = field.type.count.value;
                return `    if (${fieldName}.length != ${size}) throw ArgumentError('${fieldName} must have exactly ${size} elements, got \${${fieldName}.length}');`;
            }

            return '';
        })
        .filter(v => v)
        .join('\n');

    // Add validation for discriminator (always 8 bytes) + other validations
    const allValidations = validations
        ? `    if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got \${discriminator.length}');\n${validations}`
        : `    if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got \${discriminator.length}');`;

    // Collect all imports
    const allImports = new Set(['package:borsh_annotation/borsh_annotation.dart', 'package:solana/solana.dart']);
    structNode.fields.forEach(field => {
        const typeInfo = getTypeInfo(field.type, nameApi);
        typeInfo.imports.forEach(imp => allImports.add(imp));
    });

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
${structNode.fields
    .filter(field => field.name !== 'discriminator')
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

  String _indent(String text, int level) {
    final indent = '  ' * level;
    return text.split('\\n').map((line) => line.isEmpty ? line : '$indent$line').join('\\n');
  }

  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${instructionDataName}(');
    ${structNode.fields
        .map(field => {
            const fieldName = nameApi.instructionField(field.name);
            return `buffer.writeln(_indent('${fieldName}: $${fieldName}', indent + 1));`;
        })
        .join('\n    ')}
    buffer.write(_indent(')', indent));
    return buffer.toString();
  }
}`;

    return createFragment(content, Array.from(allImports));
}
