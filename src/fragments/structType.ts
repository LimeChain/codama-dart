import { camelCase, StructTypeNode } from '@codama/nodes';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, RenderScope } from '../utils';

export function getStructTypeFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        name: string;
        node: StructTypeNode;
        size: number | null;
    },
): Fragment {
    const { name, node, nameApi } = scope;
    const className = nameApi.definedType(camelCase(name));
    const fields = node.fields || [];


    // Collect all imports
    const allImports = new Set(['package:borsh_annotation_extended/borsh_annotation_extended.dart']);
    fields.forEach(field => {
        const typeInfo = getTypeInfo(field.type, scope.nameApi);
        typeInfo.imports.forEach(imp => allImports.add(imp));
    });

    const factoryParams = fields
        .map(field => {
            const typeInfo = getTypeInfo(field.type, scope.nameApi);
            const borshAnnotation = getBorshAnnotation(field.type, scope.nameApi);
            const fieldName = nameApi.accountField(field.name);
            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    const content = `part '${name}.g.dart';

@BorshSerializable()
class ${className} with _$${className} {
  factory ${className}({
${factoryParams}
  }) = _${className};
  

  const ${className}._();

  static ${className} fromBorsh(Uint8List data) {
    return _$${className}FromBorsh(data);
  }


  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${className}(');
    ${fields
        .map(field => {
            const fieldName = nameApi.accountField(field.name);
            return `buffer.writeln('  ${fieldName}: $${fieldName}');`;
        })
        .join('\n    ')}
    buffer.write(')');
    return buffer.toString();
  }
}`;

    return createFragment(content, Array.from(allImports));
}
