import { InstructionNode } from '@codama/nodes';
import { findProgramNodeFromPath, getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, RenderScope } from '../utils';
import { getInstructionDataFragment } from './instructionData';
import { getInstructionFunctionFragment } from './instructionFunction';

export function getInstructionPageFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        instructionPath: NodePath<InstructionNode>;
        size: number | null;
    },
): Fragment {
    const node = getLastNodeFromPath(scope.instructionPath);
    if (!findProgramNodeFromPath(scope.instructionPath)) {
        throw new Error('Instruction must be visited inside a program.');
    }

    const fragments: Fragment[] = [];
    
    // Generate instruction data type (arguments)
    const dataFragment = getInstructionDataFragment(scope);
    if (dataFragment) {
        fragments.push(dataFragment);
    }

    // Generate instruction function
    const functionFragment = getInstructionFunctionFragment(scope);
    if (functionFragment) {
        fragments.push(functionFragment);
    }

    // Combine all fragments
    const content = fragments.map(f => f.content).join('\n\n');
    const imports = new Set<string>();
    fragments.forEach(f => f.imports.forEach(imp => imports.add(imp)));

    return createFragment(content, Array.from(imports));
}