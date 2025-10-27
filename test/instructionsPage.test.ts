import { instructionNode, programNode } from '@codama/nodes';
import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../src';
import { codeContains } from './_setup';

test('it renders a public instruction data struct', () => {
    // Given the following program with 1 instruction.
    const node = programNode({
        instructions: [instructionNode({ name: 'mintTokens' })],
        name: 'splToken',
        publicKey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    });

    const options: GetRenderMapOptions = {
        nameTransformers: DEFAULT_NAME_TRANSFORMERS,
    };
    const packageName = 'test';
    const programName = 'test';
    const programId = '7ETjnyphmVcbd1TN3NuVfNDwVQ7ezHUN6HxvT7QNtWKu';

    // When we render it.
    const renderMap = visit(node, getRenderMapVisitor(options, packageName, programName, programId));

    // Then we expect the following pub struct.
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/mintTokens.dart`), [
        'Instruction mintTokensInstruction({',
        'Ed25519HDPublicKey? programId',
        'final accounts = <AccountMeta>[];',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
    ]);
});
