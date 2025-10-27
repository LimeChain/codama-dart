import { errorNode, programNode } from '@codama/nodes';
import { getFromRenderMap } from '@codama/renderers-core';
import { visit } from '@codama/visitors-core';
import { test } from 'vitest';

import { DEFAULT_NAME_TRANSFORMERS, GetRenderMapOptions, getRenderMapVisitor } from '../src';
import { codeContains } from './_setup';

test('it renders codes for errors', () => {
    // Given the following program with 2 errors.
    const node = programNode({
        errors: [
            errorNode({
                code: 6000,
                message: 'Invalid instruction',
                name: 'InvalidInstruction',
            }),
            errorNode({
                code: 7000,
                message: 'Invalid program',
                name: 'InvalidProgram',
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

    // Then we expect the following errors with codes.
    codeContains(getFromRenderMap(renderMap, `lib/${programName}/errors/splToken.dart`), [
        'class SplTokenErrors {',
        'static const int INVALID_INSTRUCTION = 6000;',
        'static const int INVALID_PROGRAM = 7000;',
        "INVALID_INSTRUCTION: 'Invalid instruction',",
        "INVALID_PROGRAM: 'Invalid program',",
        'static String getMessage(int code) {',
        'static bool isValidErrorCode(int code) {',
        'static List<int> getAllErrorCodes() {',
    ]);
});
