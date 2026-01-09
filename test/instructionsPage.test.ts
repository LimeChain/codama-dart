/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
    accountNode,
    bytesTypeNode,
    constantPdaSeedNode,
    constantPdaSeedNodeFromString,
    fixedSizeTypeNode,
    instructionAccountNode,
    instructionArgumentNode,
    instructionNode,
    numberTypeNode,
    numberValueNode,
    pdaLinkNode,
    pdaNode,
    programNode,
    publicKeyTypeNode,
    stringTypeNode,
    variablePdaSeedNode,
} from '@codama/nodes';
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
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/mintTokens.dart`).content as string, [
        'Instruction mintTokensInstruction({',
        'Ed25519HDPublicKey? programId',
        'final accounts = <AccountMeta>[];',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
    ]);
});

test('it renders an instruction with a remainder str', () => {
    // Given the following program with 1 instruction.
    const node = programNode({
        instructions: [
            instructionNode({
                arguments: [
                    instructionArgumentNode({
                        name: 'memo',
                        type: stringTypeNode('utf8'),
                    }),
                ],
                name: 'addMemo',
            }),
        ],
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/addMemo.dart`).content as string, [
        '@BorshSerializable()',
        'class AddMemoInstructionData with _$AddMemoInstructionData {',
        'factory AddMemoInstructionData({',
        '@BFixedBytes(8) required Uint8List discriminator,',
        '@BString() required String memo,',
        "if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got ${discriminator.length}');",
        'return _AddMemoInstructionData(',
        'static AddMemoInstructionData fromBorsh(Uint8List data) {',
        "buffer.writeln('AddMemoInstructionData(');",
        "buffer.writeln('  memo: $memo');",
        'Instruction addMemoInstruction({',
        'required AddMemoInstructionData data,',
    ]);
});

test('it renders a default impl for instruction data struct', () => {
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/mintTokens.dart`).content as string, [
        'Instruction mintTokensInstruction({',
        'Ed25519HDPublicKey? programId',
        'final accounts = <AccountMeta>[];',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
    ]);
});

test('it renders a byte array seed used on an account', () => {
    // Given the following program with 1 account and 1 pda with a byte array as seeds.
    const node = programNode({
        instructions: [
            instructionNode({
                arguments: [
                    instructionArgumentNode({
                        name: 'byteArraySeed',
                        type: fixedSizeTypeNode(bytesTypeNode(), 32),
                    }),
                ],
                name: 'myInstruction',
            }),
        ],
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/myInstruction.dart`).content as string, [
        '@BorshSerializable()',
        'class MyInstructionInstructionData with _$MyInstructionInstructionData {',
        'factory MyInstructionInstructionData({',
        '@BFixedBytes(8) required Uint8List discriminator,',
        '@BFixedBytes(32) required Uint8List byteArraySeed,',
        "if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got ${discriminator.length}');",
        "if (byteArraySeed.length != 32) throw ArgumentError('byteArraySeed must be exactly 32 bytes, got ${byteArraySeed.length}');",
        'return _MyInstructionInstructionData(',
        'static MyInstructionInstructionData fromBorsh(Uint8List data) {',
        "buffer.writeln('MyInstructionInstructionData(');",
        "buffer.writeln('  byteArraySeed: $byteArraySeed');",
        'Instruction myInstructionInstruction({',
        'required MyInstructionInstructionData data,',
    ]);
});

test('it renders an empty array of seeds for seedless PDAs', () => {
    // Given the following program with 1 account and 1 pda with empty seeds.
    const node = programNode({
        accounts: [
            accountNode({
                discriminators: [],
                name: 'testAccount',
                pda: pdaLinkNode('testPda'),
            }),
        ],
        instructions: [
            instructionNode({
                accounts: [instructionAccountNode({ isSigner: false, isWritable: true, name: 'testAccount' })],
                name: 'myInstruction',
            }),
        ],
        name: 'splToken',
        pdas: [pdaNode({ name: 'testPda', seeds: [] })],
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
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/myInstruction.dart`).content as string, [
        'Instruction myInstructionInstruction({',
        'required Ed25519HDPublicKey testAccount,',
        'Ed25519HDPublicKey? programId',
        'final accounts = [',
        'AccountMeta(',
        'pubKey: testAccount,',
        'isSigner: false,',
        'isWriteable: true,',
        ');',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
    ]);
});

test('it renders constant PDA seeds as prefix consts', () => {
    // Given the following PDA node attached to an account.
    const node = programNode({
        accounts: [
            accountNode({
                discriminators: [],
                name: 'testAccount',
                pda: pdaLinkNode('testPda'),
            }),
        ],
        instructions: [
            instructionNode({
                accounts: [
                    instructionAccountNode({
                        isSigner: false,
                        isWritable: true,
                        name: 'testAccount',
                    }),
                ],
                name: 'myInstruction',
            }),
        ],
        name: 'myProgram',
        pdas: [
            pdaNode({
                name: 'testPda',
                seeds: [
                    constantPdaSeedNodeFromString('utf8', 'myPrefix'),
                    variablePdaSeedNode('myAccount', publicKeyTypeNode()),
                    constantPdaSeedNode(numberTypeNode('u64'), numberValueNode(42)),
                ],
            }),
        ],
        publicKey: '1111',
    });

    const options: GetRenderMapOptions = {
        nameTransformers: DEFAULT_NAME_TRANSFORMERS,
    };
    const packageName = 'test';
    const programName = 'test';
    const programId = '7ETjnyphmVcbd1TN3NuVfNDwVQ7ezHUN6HxvT7QNtWKu';

    // When we render it.
    const renderMap = visit(node, getRenderMapVisitor(options, packageName, programName, programId));
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/myInstruction.dart`).content as string, [
        'Instruction myInstructionInstruction({',
        'required Ed25519HDPublicKey testAccount,',
        'Ed25519HDPublicKey? programId',
        'final accounts = [',
        'AccountMeta(',
        'pubKey: testAccount,',
        'isSigner: false,',
        'isWriteable: true,',
        ');',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('1111'),",
    ]);
});

test('it renders an instruction with multiple accounts', () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [
                    instructionAccountNode({
                        isSigner: true,
                        isWritable: true,
                        name: 'source',
                    }),
                    instructionAccountNode({
                        isSigner: false,
                        isWritable: true,
                        name: 'destination',
                    }),
                ],
                name: 'transfer',
            }),
        ],
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/instructions/transfer.dart`).content as string, [
        'Instruction transferInstruction({',
        'required Ed25519HDPublicKey source,',
        'required Ed25519HDPublicKey destination,',
        'Ed25519HDPublicKey? programId',
        'final accounts = [',
        'AccountMeta(',
        'pubKey: source,',
        'isSigner: true,',
        'isWriteable: true,',
        '),',
        'AccountMeta(',
        'pubKey: destination,',
        'isSigner: false,',
        'isWriteable: true,',
        ')',
        'final instructionData = ByteArray.empty();',
        "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
    ]);
});

test('it renders an instruction with both arguments and accounts', () => {
    const node = programNode({
        instructions: [
            instructionNode({
                accounts: [
                    instructionAccountNode({
                        isSigner: true,
                        isWritable: true,
                        name: 'source',
                    }),
                ],
                arguments: [
                    instructionArgumentNode({
                        name: 'amount',
                        type: numberTypeNode('u64'),
                    }),
                ],
                name: 'transferWithAmount',
            }),
        ],
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

    codeContains(
        getFromRenderMap(renderMap, `lib/${programName}/instructions/transferWithAmount.dart`).content as string,
        [
            '@BorshSerializable()',
            'class TransferWithAmountInstructionData with _$TransferWithAmountInstructionData {',
            'factory TransferWithAmountInstructionData({',
            '@BFixedBytes(8) required Uint8List discriminator,',
            '@BU64() required BigInt amount,',
            "if (discriminator.length != 8) throw ArgumentError('discriminator must be exactly 8 bytes, got ${discriminator.length}');",
            'return _TransferWithAmountInstructionData(',
            'discriminator: discriminator,',
            'amount: amount,',
            'static TransferWithAmountInstructionData fromBorsh(Uint8List data) {',
            'Instruction transferWithAmountInstruction({',
            'required Ed25519HDPublicKey source,',
            'required TransferWithAmountInstructionData data,',
            'final accounts = [',
            'AccountMeta(',
            'pubKey: source,',
            'isSigner: true,',
            'isWriteable: true,',
            'final instructionData = ByteArray(data.toBorsh());',
            "programId: programId ?? Ed25519HDPublicKey.fromBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),",
        ],
    );
});
