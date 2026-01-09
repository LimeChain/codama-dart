/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
    definedTypeNode,
    enumEmptyVariantTypeNode,
    enumStructVariantTypeNode,
    enumTypeNode,
    numberTypeNode,
    programNode,
    sizePrefixTypeNode,
    stringTypeNode,
    structFieldTypeNode,
    structTypeNode,
} from '@codama/nodes';
import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../src';
import { codeContains, codeDoesNotContains } from './_setup';

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
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/tag.dart`).content as string, [
        'class Tag {',
        'factory Tag.uninitialized() {',
        'factory Tag.account() {',
        'Uint8List toBorsh() {',
    ]);

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/uninitialized.dart`).content as string, [
        'class Uninitialized {',
        'static Uninitialized fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BUninitialized implements BType<Uninitialized> {',
    ]);

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/account.dart`).content as string, [
        'class Account {',
        'static Account fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BAccount implements BType<Account> {',
    ]);
});

test('it renders a prefix string on a defined type', () => {
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'blob',
                type: structTypeNode([
                    structFieldTypeNode({
                        name: 'contentType',
                        type: sizePrefixTypeNode(stringTypeNode('utf8'), numberTypeNode('u8')),
                    }),
                ]),
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

    const renderMap = visit(node, getRenderMapVisitor(options, packageName, programName, programId));
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/blob.dart`).content as string, [
        '@BorshSerializable()',
        'class Blob with _$Blob {',
        'factory Blob({',
        '@BString() required String contentType,',
        '}) = _Blob;',
        'const Blob._();',
        'static Blob fromBorsh(Uint8List data) {',
        'return _$BlobFromBorsh(data);',
    ]);
});

test('it renders a scalar enum with Copy derive', () => {
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

    const renderMap = visit(node, getRenderMapVisitor(options, packageName, programName, programId));

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/tag.dart`).content as string, [
        'class Tag {',
        'factory Tag.uninitialized() {',
        'factory Tag.account() {',
        'Uint8List toBorsh() {',
    ]);
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/uninitialized.dart`).content as string, [
        'class Uninitialized {',
        'const Uninitialized();',
        'static Uninitialized fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BUninitialized implements BType<Uninitialized> {',
    ]);
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tag/account.dart`).content as string, [
        'class Account {',
        'const Account();',
        'static Account fromBorsh(Uint8List _data) {',
        'Uint8List toBorsh() {',
        'class BAccount implements BType<Account> {',
    ]);
});

test('it renders a non-scalar enum without Copy derive', () => {
    // Given the following program with 1 defined type using a prefixed size string.
    const node = programNode({
        definedTypes: [
            definedTypeNode({
                name: 'tagWithStruct',
                type: enumTypeNode([
                    enumEmptyVariantTypeNode('Uninitialized'),
                    enumStructVariantTypeNode(
                        'Account',
                        structTypeNode([
                            structFieldTypeNode({
                                name: 'contentType',
                                type: sizePrefixTypeNode(stringTypeNode('utf8'), numberTypeNode('u8')),
                            }),
                        ]),
                    ),
                ]),
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
        getFromRenderMap(renderMap, `lib/${programName}/types/tagWithStruct/tagWithStruct.dart`).content as string,
        [
            'class TagWithStruct {',
            'factory TagWithStruct.uninitialized() {',
            'factory TagWithStruct.account({required String contentType}) {',
        ],
    );

    codeContains(getFromRenderMap(renderMap, `lib/${programName}/types/tagWithStruct/account.dart`).content as string, [
        '@BorshSerializable()',
        'class Account with _$Account {',
        'factory Account({',
        '@BString() required String contentType,',
        '}) = _Account;',
        'static Account fromBorsh(Uint8List data) {',
        'return _$AccountFromBorsh(data);',
    ]);

    codeDoesNotContains(
        getFromRenderMap(renderMap, `lib/${programName}/types/tagWithStruct/account.dart`).content as string,
        ['const Account();'],
    );
});
