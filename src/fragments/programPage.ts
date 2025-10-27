import { ProgramNode } from '@codama/nodes';

import { createFragment, Fragment, RenderScope } from '../utils';

export function getProgramPageFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        programNode: ProgramNode;
    },
): Fragment {
    const { programNode, nameApi } = scope;
    const className = nameApi.programType(programNode.name);
    const programId = programNode.publicKey || 'Ca2XuYJBdeC4SzhNFH4sUeBxrcE5ko4Gv4VgZb917dir';

    const content = `/// Program constants and utilities for ${programNode.name}
class ${className} {
  /// The program ID
  static const String programId = '${programId}';

  /// Get the program's Ed25519HDPublicKey
  static Ed25519HDPublicKey get publicKey {
    return Ed25519HDPublicKey.fromBase58(programId);
  }

  /// Program name
  static const String name = '${programNode.name}';

  /// Program version (if available)
  static const String version = '${programNode.version || '1.0.0'}';
}`;

    return createFragment(content, ['package:solana/solana.dart']);
}
