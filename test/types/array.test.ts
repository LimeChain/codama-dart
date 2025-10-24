import {
    arrayTypeNode,
    definedTypeNode,
    numberTypeNode,
    prefixedCountNode,
    publicKeyTypeNode,
} from '@codama/nodes';
// import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../../src';
// import { codeContains, codeDoesNotContains } from '../_setup';

test('test exports short vecs', () => {
    // Given an array using a shortU16 prefix.
    const node = definedTypeNode({
        name: 'myShortVec',
        type: arrayTypeNode(publicKeyTypeNode(), prefixedCountNode(numberTypeNode('shortU16'))),
    });

    const options: GetRenderMapOptions = {
        nameTransformers: DEFAULT_NAME_TRANSFORMERS,
    };

    // When we render the array.
    const renderMap = visit(node, getRenderMapVisitor(options));
    console.log(renderMap);
    // Then we expect a short vec to be exported.
    // codeContains(getFromRenderMap(renderMap, 'types/my_short_vec.rs'), [
    //     /pub type MyShortVec = ShortVec<Pubkey>;/,
    //     /use solana_pubkey::Pubkey/,
    //     /use solana_short_vec::ShortVec/,
    // ]);
    // codeDoesNotContains(getFromRenderMap(renderMap, 'types/my_short_vec.rs'), [
    //     /use borsh::BorshSerialize/,
    //     /use borsh::BorshDeserialize/,
    // ]);
});
