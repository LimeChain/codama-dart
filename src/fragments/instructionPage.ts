import { InstructionNode } from '@codama/nodes';
import { findProgramNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, RenderScope } from '../utils';
import { getInstructionDataFragment } from './instructionData';
import { getInstructionFunctionFragment } from './instructionFunction';

export function getInstructionPageFragment(
    scope: Pick<RenderScope, 'definedTypes' | 'nameApi' | 'packageName' | 'programName'> & {
        instructionPath: NodePath<InstructionNode>;
    },
): Fragment {
    if (!findProgramNodeFromPath(scope.instructionPath)) {
        throw new Error('Instruction must be visited inside a program.');
    }

    const fragments: Fragment[] = [];

    const dataFragment = getInstructionDataFragment(scope);
    if (dataFragment) {
        fragments.push(dataFragment);
    }

    const functionFragment = getInstructionFunctionFragment(scope);
    if (functionFragment) {
        fragments.push(functionFragment);
    }

    const content = fragments.map(f => f.content).join('\n\n');
    const imports = new Set<string>();
    fragments.forEach(f => f.imports.forEach(imp => imports.add(imp)));

    return createFragment(content, Array.from(imports));
}
