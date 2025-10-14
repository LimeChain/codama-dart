import { getAllInstructionsWithSubs, getAllPrograms } from '@codama/nodes';
import { RootNode } from '@codama/nodes';

import { Fragment } from '../utils';

export function getLibraryIndexFragment(scope: { rootNode: RootNode }): Fragment {
    const { rootNode } = scope;

    const programs = getAllPrograms(rootNode);
    const exports: string[] = [];

    programs.forEach(program => {
        program.accounts.forEach(account => {
            exports.push(`export 'accounts/${account.name}.dart';`);
        });
    });

    programs.forEach(program => {
        getAllInstructionsWithSubs(program, { leavesOnly: true }).forEach(instruction => {
            exports.push(`export 'instructions/${instruction.name}.dart';`);
        });
    });

    programs.forEach(program => {
        program.definedTypes.forEach(type => {
            if (type.type.kind === 'structTypeNode') {
                exports.push(`export 'types/${type.name}.dart';`);
            }
        });
    });

    programs.forEach(program => {
        if (program.errors.length > 0) {
            exports.push(`export 'errors/${program.name}.dart';`);
        }
    });

    programs.forEach(program => {
        getAllInstructionsWithSubs(program, { leavesOnly: true }).forEach(instruction => {
            instruction.accounts.forEach(account => {
                if (account.defaultValue?.kind === 'pdaValueNode') {
                    exports.push(`export 'pdas/${account.name}.dart';`);
                }
            });
        });
    });

    exports.sort();
    const uniqueExports = Array.from(new Set(exports));

    const exportsContent =
        uniqueExports.length > 0 ? uniqueExports.join('\n') : '// No exports found - check your program structure';

    const contentString = `/// Generated Dart library for Solana program interaction;

${exportsContent}
`;

    const content: Fragment = {
        content: contentString,
        imports: new Set<string>(),
    };

    return content;
}
