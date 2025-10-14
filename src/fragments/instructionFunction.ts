import { InstructionNode, isNode, PdaSeedValueNode } from '@codama/nodes';
import { findProgramNodeFromPath, getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, RenderScope } from '../utils';
import { getBuiltinProgramAddress } from '../utils/builtinPrograms';
import { generatePdaSeeds } from '../utils/pda';

export function getInstructionFunctionFragment(
    scope: Pick<RenderScope, 'nameApi'> & {
        instructionPath: NodePath<InstructionNode>;
        size: number | null;
    },
): Fragment | undefined {
    const { instructionPath, nameApi } = scope;
    const instructionNode = getLastNodeFromPath(instructionPath);
    const programNode = findProgramNodeFromPath(instructionPath)!;

    const functionName = nameApi.instructionFunction(instructionNode.name);
    const instructionDataName = nameApi.instructionDataType(instructionNode.name);

    const hasAccounts = instructionNode.accounts.length > 0;
    const hasArguments = instructionNode.arguments.length > 0;

    // Generate function parameters
    const params: string[] = [];

    // Add account parameters
    if (hasAccounts) {
        instructionNode.accounts.forEach(account => {
            const accountName = nameApi.instructionField(account.name);

            // Check if this account has a default PDA value
            const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');

            // Check if this account has a builtin program default
            const builtinAddress = getBuiltinProgramAddress(account.name);

            // Check if PDA can be auto-derived (doesn't reference instruction arguments)
            let canAutoderivePda = false;
            if (hasDefaultPda) {
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    canAutoderivePda = true;
                    // Check all seeds to see if any reference instruction arguments
                    for (const seed of pdaValue.pda.seeds) {
                        if (isNode(seed, 'variablePdaSeedNode')) {
                            const valueSeed = pdaValue.seeds?.find(
                                (s: PdaSeedValueNode) => s.name === seed.name,
                            )?.value;

                            // If seed references an instruction argument (not an account), can't auto-derive
                            if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                canAutoderivePda = false;
                                break;
                            }
                        }
                    }
                }
            }

            if ((hasDefaultPda && canAutoderivePda) || builtinAddress) {
                // Make the parameter optional if it has a derivable PDA default or builtin program default
                const accountParam = `Ed25519HDPublicKey? ${accountName}`;
                params.push(accountParam);
            } else {
                const accountParam = `required Ed25519HDPublicKey ${accountName}`;
                params.push(accountParam);
            }
        });
    }

    // Add instruction data parameter
    if (hasArguments) {
        params.push(`required ${instructionDataName} data`);
    }

    // Add program ID parameter (optional, with default)
    params.push('Ed25519HDPublicKey? programId');

    const parameterList = params.length > 0 ? `{\n  ${params.join(',\n  ')}\n}` : '';

    // Generate PDA resolution and account metas
    let pdaResolutionCode = '';
    let accountMetas = '';

    if (hasAccounts) {
        // Generate PDA resolution and builtin program defaults for accounts with default values
        const pdaResolutions: string[] = [];

        instructionNode.accounts.forEach(account => {
            const accountName = nameApi.instructionField(account.name);
            const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
            const builtinAddress = getBuiltinProgramAddress(account.name);

            // Check if PDA can be auto-derived (doesn't reference instruction arguments)
            let canAutoderivePda = false;
            if (hasDefaultPda) {
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    canAutoderivePda = true;
                    // Check all seeds to see if any reference instruction arguments
                    for (const seed of pdaValue.pda.seeds) {
                        if (isNode(seed, 'variablePdaSeedNode')) {
                            const valueSeed = pdaValue.seeds?.find(
                                (s: PdaSeedValueNode) => s.name === seed.name,
                            )?.value;

                            // If seed references an instruction argument (not an account), can't auto-derive
                            if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                canAutoderivePda = false;
                                break;
                            }
                        }
                    }
                }
            }

            if (hasDefaultPda && canAutoderivePda) {
                // Generate PDA derivation code only for derivable PDAs
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    const seeds = generatePdaSeeds(pdaValue.pda, pdaValue.seeds, nameApi);

                    pdaResolutions.push(
                        `  final resolved${accountName.charAt(0).toUpperCase() + accountName.slice(1)} = ${accountName} ?? ` +
                            `await Ed25519HDPublicKey.findProgramAddress(\n    seeds: [${seeds.join(', ')}],\n    programId: programId ?? Ed25519HDPublicKey.fromBase58('${programNode.publicKey ?? 'PROGRAM_ID_HERE'}'),\n  );`,
                    );
                }
            } else if (builtinAddress) {
                // Generate builtin program default
                pdaResolutions.push(
                    `  final resolved${accountName.charAt(0).toUpperCase() + accountName.slice(1)} = ${accountName} ?? Ed25519HDPublicKey.fromBase58('${builtinAddress}');`,
                );
            }
        });

        if (pdaResolutions.length > 0) {
            pdaResolutionCode = pdaResolutions.join('\n') + '\n\n';
        }

        // Generate account meta list with resolved PDAs and builtin programs
        const accountMetaList = instructionNode.accounts
            .map(account => {
                const accountName = nameApi.instructionField(account.name);
                const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
                const builtinAddress = getBuiltinProgramAddress(account.name);

                // Check if PDA can be auto-derived (doesn't reference instruction arguments)
                let canAutoderivePda = false;
                if (hasDefaultPda) {
                    const pdaValue = account.defaultValue;
                    if (isNode(pdaValue.pda, 'pdaNode')) {
                        canAutoderivePda = true;
                        // Check all seeds to see if any reference instruction arguments
                        for (const seed of pdaValue.pda.seeds) {
                            if (isNode(seed, 'variablePdaSeedNode')) {
                                const valueSeed = pdaValue.seeds?.find(
                                    (s: PdaSeedValueNode) => s.name === seed.name,
                                )?.value;

                                // If seed references an instruction argument (not an account), can't auto-derive
                                if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                    canAutoderivePda = false;
                                    break;
                                }
                            }
                        }
                    }
                }

                const resolvedAccountName =
                    (hasDefaultPda && canAutoderivePda) || builtinAddress
                        ? `resolved${accountName.charAt(0).toUpperCase() + accountName.slice(1)}`
                        : accountName;

                const isWriteable = account.isWritable ? 'true' : 'false';
                const isSigner = account.isSigner === true ? 'true' : 'false';

                return `    AccountMeta(\n      pubKey: ${resolvedAccountName},\n      isSigner: ${isSigner},\n      isWriteable: ${isWriteable},\n    )`;
            })
            .join(',\n');

        accountMetas = `  final accounts = [\n${accountMetaList}\n  ];\n`;
    } else {
        accountMetas = '  final accounts = <AccountMeta>[];\n';
    }

    // Generate instruction data serialization
    let dataSerializationCode = '';
    if (hasArguments) {
        dataSerializationCode = `  final instructionData = ByteArray(data.toBorsh());\n`;
    } else {
        dataSerializationCode = `  final instructionData = ByteArray.empty();\n`;
    }

    // Determine if function needs to be async (if any derivable PDAs need to be resolved)
    const needsAsync = instructionNode.accounts.some(account => {
        const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
        if (!hasDefaultPda) return false;

        // Check if PDA can be auto-derived (doesn't reference instruction arguments)
        const pdaValue = account.defaultValue;
        if (isNode(pdaValue.pda, 'pdaNode')) {
            let canAutoderive = true;
            for (const seed of pdaValue.pda.seeds) {
                if (isNode(seed, 'variablePdaSeedNode')) {
                    const valueSeed = pdaValue.seeds?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;

                    // If seed references an instruction argument (not an account), can't auto-derive
                    if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                        canAutoderive = false;
                        break;
                    }
                }
            }
            return canAutoderive;
        }
        return false;
    });

    // Generate the function body
    const functionBody = `${pdaResolutionCode}${accountMetas}${dataSerializationCode}
  return Instruction(
    programId: programId ?? Ed25519HDPublicKey.fromBase58('${programNode.publicKey ?? 'PROGRAM_ID_HERE'}'),
    accounts: accounts,
    data: instructionData,
  );`;

    const asyncModifier = needsAsync ? 'Future<' : '';
    const asyncSuffix = needsAsync ? '>' : '';
    const asyncKeyword = needsAsync ? 'async ' : '';

    const content = `/// Creates a ${instructionNode.name} instruction
${asyncModifier}Instruction${asyncSuffix} ${functionName}(${parameterList}) ${asyncKeyword}{
${functionBody}
}`;

    // Collect imports
    const imports = new Set(['package:solana/solana.dart']);

    // // Add dart:convert import if we're using utf8.encode
    // if (needsAsync) {
    //     imports.add('dart:convert');
    // }

    // Note: instruction data class is generated in the same file, no import needed

    return createFragment(content, Array.from(imports));
}
