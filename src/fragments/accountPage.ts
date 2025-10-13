import { AccountNode, isNode, resolveNestedTypeNode } from '@codama/nodes';
import { findProgramNodeFromPath,getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, getBorshAnnotation, getTypeInfo, RenderScope } from '../utils';

export function getAccountPageFragment(
    scope: Pick<RenderScope, 'customAccountData' | 'linkables' | 'nameApi'> & {
        accountPath: NodePath<AccountNode>;
        size: number | null;
    },
): Fragment {
    const node = getLastNodeFromPath(scope.accountPath);
    const className = scope.nameApi.accountType(node.name);
    const size = scope.size;
    const programNode = findProgramNodeFromPath(scope.accountPath);

    // Get the account data structure
    const dataTypeNode = resolveNestedTypeNode(node.data);

    // Check if this is a struct type with fields
    if (dataTypeNode.kind === 'structTypeNode') {
        return getStructAccountFragment(node, scope, className, size, programNode);
    }

    // For simple types, create a basic account class
    const typeInfo = getTypeInfo(dataTypeNode, scope.nameApi);
    const borshAnnotation = getBorshAnnotation(dataTypeNode, scope.nameApi);
    const allImports = ['package:borsh_annotation/borsh_annotation.dart', 'package:solana/solana.dart', ...typeInfo.imports.filter(imp => imp !== 'dart:typed_data')];
    
    // Generate PDA derivation method
    const pdaMethod = generatePdaMethodForAccount(node.name, programNode);

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

${pdaMethod}

  String _indent(String text, int level) {
    final indent = '  ' * level;
    return text.split('\\n').map((line) => line.isEmpty ? line : '$indent$line').join('\\n');
  }

  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${className}(');
    buffer.writeln(_indent('data: $data', indent + 1));
    buffer.write(_indent(')', indent));
    return buffer.toString();
  }
}`;

    return createFragment(content, allImports);
}

function getStructAccountFragment(
    node: AccountNode,
    scope: Pick<RenderScope, 'customAccountData' | 'linkables' | 'nameApi'> & {
        accountPath: NodePath<AccountNode>;
        size: number | null;
    },
    className: string,
    _size: number | null,
    programNode: any,
): Fragment {
    const dataTypeNode = resolveNestedTypeNode(node.data);
    const fields = isNode(dataTypeNode, 'structTypeNode') ? dataTypeNode.fields : [];

    // Generate factory constructor parameters with Borsh annotations
    const factoryParams = fields
        .map(field => {
            const typeInfo = getTypeInfo(field.type, scope.nameApi);
            const borshAnnotation = getBorshAnnotation(field.type, scope.nameApi);
            const fieldName = scope.nameApi.accountField(field.name);
            return `    ${borshAnnotation} required ${typeInfo.dartType} ${fieldName},`;
        })
        .join('\n');

    // Collect all imports (filter out dart:typed_data)
    const allImports = new Set(['package:borsh_annotation/borsh_annotation.dart', 'package:solana/solana.dart']);
    fields.forEach(field => {
        const typeInfo = getTypeInfo(field.type, scope.nameApi);
        typeInfo.imports.filter(imp => imp !== 'dart:typed_data').forEach(imp => allImports.add(imp));
    });

    // Generate PDA derivation method
    const pdaMethod = generatePdaMethodForAccount(node.name, programNode);

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

${pdaMethod}

  String _indent(String text, int level) {
    final indent = '  ' * level;
    return text.split('\\n').map((line) => line.isEmpty ? line : '$indent$line').join('\\n');
  }

  @override
  String toString([int indent = 0]) {
    final buffer = StringBuffer();
    buffer.writeln('${className}(');
    ${fields.map(field => {
        const fieldName = scope.nameApi.accountField(field.name);
        return `buffer.writeln(_indent('${fieldName}: $${fieldName}', indent + 1));`;
    }).join('\n    ')}
    buffer.write(_indent(')', indent));
    return buffer.toString();
  }
}`;

    return createFragment(content, Array.from(allImports));
}

function generatePdaMethodForAccount(accountName: string, programNode: any): string {
    const programId = programNode?.publicKey || 'Ca2XuYJBdeC4SzhNFH4sUeBxrcE5ko4Gv4VgZb917dir';
    
    // PDA patterns based on analysis of the solana_music.json IDL
    switch (accountName.toLowerCase()) {
        case 'programconfig':
            return `  /// Derives the PDA address for ProgramConfig
  static Future<Ed25519HDPublicKey> derivePDA() {
    return Ed25519HDPublicKey.findProgramAddress(
      seeds: [Uint8List.fromList([112, 114, 111, 103, 114, 97, 109, 95, 99, 111, 110, 102, 105, 103])], // "program_config"
      programId: Ed25519HDPublicKey.fromBase58('${programId}'),
    );
  }`;
        
        case 'token':
            return `  /// Derives the PDA address for Token
  static Future<Ed25519HDPublicKey> derivePDA(Ed25519HDPublicKey mint) {
    return Ed25519HDPublicKey.findProgramAddress(
      seeds: [Uint8List.fromList([116, 111, 107, 101, 110]), mint.toByteArray()], // "token" + mint
      programId: Ed25519HDPublicKey.fromBase58('${programId}'),
    );
  }`;
        
        case 'user':
            return `  /// Derives the PDA address for User  
  static Future<Ed25519HDPublicKey> derivePDA(Ed25519HDPublicKey user, Ed25519HDPublicKey token) {
    return Ed25519HDPublicKey.findProgramAddress(
      seeds: [Uint8List.fromList([117, 115, 101, 114]), user.toByteArray(), token.toByteArray()], // "user" + user + token
      programId: Ed25519HDPublicKey.fromBase58('${programId}'),
    );
  }`;
        
        case 'tokenpricing':
            return `  /// Derives the PDA address for TokenPricing
  static Future<Ed25519HDPublicKey> derivePDA(Ed25519HDPublicKey mint) {
    return Ed25519HDPublicKey.findProgramAddress(
      seeds: [Uint8List.fromList([116, 111, 107, 101, 110, 95, 112, 114, 105, 99, 105, 110, 103]), mint.toByteArray()], // "token_pricing" + mint
      programId: Ed25519HDPublicKey.fromBase58('${programId}'),
    );
  }`;
        
        default:
            return `  /// Derives the PDA address for ${accountName}
  /// Note: Add the correct seeds based on your account's PDA pattern
  static Future<Ed25519HDPublicKey> derivePDA({required List<Uint8List> seeds}) {
    return Ed25519HDPublicKey.findProgramAddress(
      seeds: seeds,
      programId: Ed25519HDPublicKey.fromBase58('${programId}'),
    );
  }`;
    }
}
