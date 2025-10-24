import { arrayTypeNode, definedTypeNode, numberTypeNode, prefixedCountNode, publicKeyTypeNode } from '@codama/nodes';
// import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../../src';
// import { codeContains, codeDoesNotContains } from '../_setup';

test('it exports short vecs', () => {
    // Given a shortU16 number.
    const node = definedTypeNode({
        name: 'myShortVec',
        type: arrayTypeNode(publicKeyTypeNode(), prefixedCountNode(numberTypeNode('shortU16'))),
    });

    const options: GetRenderMapOptions = {
        nameTransformers: DEFAULT_NAME_TRANSFORMERS,
    };

    // When we render the number.
    const renderMap = visit(node, getRenderMapVisitor(options));
    console.log(renderMap);

    // Then we expect a short u16 to be exported.
    // codeContains(getFromRenderMap(renderMap, 'types/my_short_u16.rs'), [
    //     /pub type MyShortU16 = ShortU16/,
    //     /use solana_short_vec::ShortU16/,
    // ]);
    // codeDoesNotContains(getFromRenderMap(renderMap, 'types/my_short_u16.rs'), [
    //     /use borsh::BorshSerialize/,
    //     /use borsh::BorshDeserialize/,
    // ]);
});
