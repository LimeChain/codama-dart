/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
    accountNode,
    camelCase,
    constantPdaSeedNode,
    constantPdaSeedNodeFromString,
    numberTypeNode,
    numberValueNode,
    pdaLinkNode,
    pdaNode,
    programNode,
    publicKeyTypeNode,
    variablePdaSeedNode,
} from '@codama/nodes';
import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../src';
import { codeContains } from './_setup';

test('it renders the Dart account class structure', () => {
    // Given the following program with 1 account and 1 pda with empty seeds.
    const node = programNode({
        accounts: [
            accountNode({
                discriminators: [],
                name: 'testAccount',
                pda: pdaLinkNode('testPda'),
            }),
        ],
        name: 'splToken',
        pdas: [
            // Empty array seeds.
            pdaNode({ name: 'testPda', seeds: [] }),
        ],
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

    // Then we expect the following identifier and reference to the byte array
    // as a parameters to be rendered.
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/accounts/testAccount.dart`).content as string, [
        '@BorshSerializable()',
        'class TestAccount with _$TestAccount {',
        'factory TestAccount({',
        "part 'testAccount.g.dart';",
        'static TestAccount fromBorsh(Uint8List data) {',
    ]);
});

test('it renders the Dart account file with all imports and part directive', () => {
    // Given the following PDA node attached to an account.
    const node = programNode({
        accounts: [accountNode({ discriminators: [], name: 'testAccount', pda: pdaLinkNode('testPda') })],
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/accounts/testAccount.dart`).content as string, [
        'library test;',
        'const TestAccount._();',
        "import 'package:borsh_annotation_extended/borsh_annotation_extended.dart';",
    ]);
});

test('it renders the class definition and serialization logic', () => {
    // Given the following account.
    const node = programNode({
        accounts: [
            accountNode({
                discriminators: [
                    {
                        kind: 'fieldDiscriminatorNode',
                        name: camelCase('discriminator'),
                        offset: 0,
                    },
                ],
                name: 'testAccount',
                pda: pdaLinkNode('testPda'),
            }),
        ],
        name: 'myProgram',
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/accounts/testAccount.dart`).content as string, [
        "part 'testAccount.g.dart';",
        '@BorshSerializable()',
        'class TestAccount with _$TestAccount {',
        'factory TestAccount({',
        '}) = _TestAccount;',
        'const TestAccount._();',
        'static TestAccount fromBorsh(Uint8List data) {',
        'return _$TestAccountFromBorsh(data);',
    ]);
});

test('it renders the toString method implementation', () => {
    // Given the following account.
    const node = programNode({
        accounts: [
            accountNode({
                discriminators: [
                    {
                        kind: 'fieldDiscriminatorNode',
                        name: camelCase('discriminator'),
                        offset: 0,
                    },
                ],
                name: 'testAccount',
                pda: pdaLinkNode('testPda'),
            }),
        ],
        name: 'myProgram',
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

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/accounts/testAccount.dart`).content as string, [
        '@override',
        'String toString([int indent = 0]) {',
        'final buffer = StringBuffer();',
        "buffer.writeln('TestAccount(');",
        "buffer.write(')');",
        'return buffer.toString();',
    ]);
});
