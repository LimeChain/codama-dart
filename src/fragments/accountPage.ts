import { AccountNode, isNode, resolveNestedTypeNode } from '@codama/nodes';
import { findProgramNodeFromPath, getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, RenderScope } from '../utils';

export function getAccountPageFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        accountPath: NodePath<AccountNode>;
        size: number | null;
    },
): Fragment {
    const node = getLastNodeFromPath(scope.accountPath);
    const className = scope.nameApi.accountType(node.name);
    const programNode = findProgramNodeFromPath(scope.accountPath);
    if (!programNode) {
        throw new Error(`Could not find program node for account: ${node.name}`);
    }

    const dataTypeNode = resolveNestedTypeNode(node.data);

    if (dataTypeNode.kind === 'structTypeNode') {
        return getStructAccountFragment(node, scope, className);
    }

    const typeInfo = getTypeInfo(dataTypeNode, scope.nameApi);
    const borshAnnotation = getBorshAnnotation(dataTypeNode, scope.nameApi);
    const allImports = [
        'package:borsh_annotation_extended/borsh_annotation_extended.dart',
        ...typeInfo.imports,
    ];

    const content = `part '${node.name}.g.dart';

@BorshSerializable()
class ${className} with _$${className} {
  factory ${className}({
    ${borshAnnotation} required ${typeInfo.dartType} data,
  }) = _${className};

  const ${className}._();

  static ${className} fromBorsh(Uint8List data) {
    return _$${className}FromBorsh(data);
  }


  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${className}(');
    buffer.writeln('  data: $data');
    buffer.write(')');
    return buffer.toString();
  }
}`;

    return createFragment(content, allImports);
}

function getStructAccountFragment(
    node: AccountNode,
    scope: Pick<RenderScope, 'nameApi'> & {
        accountPath: NodePath<AccountNode>;
        size: number | null;
    },
    className: string,
): Fragment {
    const dataTypeNode = resolveNestedTypeNode(node.data);
    const fields = isNode(dataTypeNode, 'structTypeNode') ? dataTypeNode.fields : [];

    const factoryParams = fields
        .map(field => {
            const typeInfo = getTypeInfo(field.type, scope.nameApi);
            const borshAnnotation = getBorshAnnotation(field.type, scope.nameApi);
            const fieldName = scope.nameApi.accountField(field.name);
            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    const allImports = new Set(['package:borsh_annotation_extended/borsh_annotation_extended.dart']);
    fields.forEach(field => {
        const typeInfo = getTypeInfo(field.type, scope.nameApi);
        typeInfo.imports.forEach(imp => allImports.add(imp));
    });

    const content = `part '${node.name}.g.dart';

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
            const fieldName = scope.nameApi.accountField(field.name);
            return `buffer.writeln('  ${fieldName}: $${fieldName}');`;
        })
        .join('\n    ')}
    buffer.write(')');
    return buffer.toString();
  }
}`;

    return createFragment(content, Array.from(allImports));
}
