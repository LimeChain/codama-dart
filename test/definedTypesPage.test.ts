import { definedTypeNode, enumEmptyVariantTypeNode, enumTypeNode, programNode } from '@codama/nodes';
import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../src';
import { codeContains } from './_setup';

test('it renders enum type and its variants', () => {
    // Given the following program with 1 defined type using a prefixed size string.
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'tag',
                type: enumTypeNode([enumEmptyVariantTypeNode('Uninitialized'), enumEmptyVariantTypeNode('Account')]),
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

    // Then we expect the following use and identifier to be rendered.
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/tag.dart`), [
        'class Tag {',
        'factory Tag.uninitialized() {',
        'factory Tag.account() {',
        'Uint8List toBorsh() {',
    ]);

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/uninitialized.dart`), [
        'class Uninitialized {',
        'static Uninitialized fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BUninitialized implements BType<Uninitialized> {',
    ]);

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/account.dart`), [
        'class Account {',
        'static Account fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BAccount implements BType<Account> {',
    ]);
});
