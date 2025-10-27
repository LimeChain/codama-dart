import { InstructionNode, isNode, pascalCase, PdaSeedValueNode, RootNode } from '@codama/nodes';
import { findProgramNodeFromPath, getLastNodeFromPath, NodePath } from '@codama/visitors-core';

import { createFragment, Fragment, RenderScope } from '../utils';
import { getBuiltinProgramAddress } from '../utils/builtinPrograms';

export function getInstructionFunctionFragment(
    scope: Pick<RenderScope, 'nameApi' | 'packageName' | 'programName'> & {
        instructionPath: NodePath<InstructionNode>;
    },
): Fragment | undefined {
    const { instructionPath, nameApi } = scope;
    const instructionNode = getLastNodeFromPath(instructionPath);
    const programNode = findProgramNodeFromPath(instructionPath)!;

    const rootNode = instructionPath.find(node => node.kind === 'rootNode') as RootNode;
    let rootProgramClassName: string;
    if (rootNode) {
        rootProgramClassName = `${nameApi.programType(rootNode.program.name)}.programId`;
    } else {
        rootProgramClassName = `'${programNode.publicKey}'`;
    }

    const functionName = nameApi.instructionFunction(instructionNode.name);
    const instructionDataName = nameApi.instructionDataType(instructionNode.name);

    const hasAccounts = instructionNode.accounts.length > 0;
    const hasArguments = instructionNode.arguments.length > 0;

    const params: string[] = [];
    const pdaImports = new Set<string>();

    if (hasAccounts) {
        instructionNode.accounts.forEach(account => {
            const accountName = nameApi.instructionField(account.name);

            const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');

            const builtinAddress = getBuiltinProgramAddress(account.name);

            let canAutoderivePda = false;
            if (hasDefaultPda) {
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    canAutoderivePda = true;
                    for (const seed of pdaValue.pda.seeds) {
                        if (isNode(seed, 'variablePdaSeedNode')) {
                            const valueSeed = pdaValue.seeds?.find(
                                (s: PdaSeedValueNode) => s.name === seed.name,
                            )?.value;

                            if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                canAutoderivePda = true;
                                break;
                            }
                        }
                    }
                }
            }

            if ((hasDefaultPda && canAutoderivePda) || builtinAddress) {
                const accountParam = `Ed25519HDPublicKey? ${accountName}`;
                params.push(accountParam);
            } else {
                const accountParam = `required Ed25519HDPublicKey ${accountName}`;
                params.push(accountParam);
            }
        });
    }

    if (hasArguments) {
        params.push(`required ${instructionDataName} data`);
    }

    params.push('Ed25519HDPublicKey? programId');

    const parameterList = params.length > 0 ? `{\n  ${params.join(',\n  ')}\n}` : '';

    let pdaResolutionCode = '';
    let accountMetas = '';

    if (hasAccounts) {
        const pdaResolutions: string[] = [];

        instructionNode.accounts.forEach(account => {
            const accountName = nameApi.instructionField(account.name);
            const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
            const builtinAddress = getBuiltinProgramAddress(account.name);

            let canAutoderivePda = false;
            if (hasDefaultPda) {
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    canAutoderivePda = true;
                    for (const seed of pdaValue.pda.seeds) {
                        if (isNode(seed, 'variablePdaSeedNode')) {
                            const valueSeed = pdaValue.seeds?.find(
                                (s: PdaSeedValueNode) => s.name === seed.name,
                            )?.value;

                            if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                canAutoderivePda = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (hasDefaultPda && canAutoderivePda) {
                const pdaValue = account.defaultValue;
                if (isNode(pdaValue.pda, 'pdaNode')) {
                    const resolvePdaFunctionName = `derive${pascalCase(pdaValue.pda.name)}Pda`;

                    const params: string[] = [];

                    pdaValue.seeds?.forEach(seed => {
                        if (isNode(seed.value, 'accountValueNode')) {
                            params.push(`${seed.value.name}`);
                        } else if (isNode(seed.value, 'argumentValueNode')) {
                            params.push(`data.${seed.value.name}`);
                        }
                    });

                    pdaImports.add(`package:${scope.packageName}/${scope.programName}/pdas/${pdaValue.pda.name}.dart`);

                    pdaResolutions.push(
                        `  final resolved${accountName.charAt(0).toUpperCase() + accountName.slice(1)} = ${accountName} ?? ` +
                            `await ${resolvePdaFunctionName}(${params.join(', ')});`,
                    );
                }
            } else if (builtinAddress) {
                pdaResolutions.push(
                    `  final resolved${accountName.charAt(0).toUpperCase() + accountName.slice(1)} = ${accountName} ?? Ed25519HDPublicKey.fromBase58('${builtinAddress}');`,
                );
            }
        });

        if (pdaResolutions.length > 0) {
            pdaResolutionCode = pdaResolutions.join('\n') + '\n\n';
        }

        const accountMetaList = instructionNode.accounts
            .map(account => {
                const accountName = nameApi.instructionField(account.name);
                const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
                const builtinAddress = getBuiltinProgramAddress(account.name);

                let canAutoderivePda = false;
                if (hasDefaultPda) {
                    const pdaValue = account.defaultValue;
                    if (isNode(pdaValue.pda, 'pdaNode')) {
                        canAutoderivePda = true;
                        for (const seed of pdaValue.pda.seeds) {
                            if (isNode(seed, 'variablePdaSeedNode')) {
                                const valueSeed = pdaValue.seeds?.find(
                                    (s: PdaSeedValueNode) => s.name === seed.name,
                                )?.value;

                                if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                                    canAutoderivePda = true;
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

                const isWriteable = String(account.isWritable);
                const isSigner = String(account.isSigner === true);

                return `    AccountMeta(\n      pubKey: ${resolvedAccountName},\n      isSigner: ${isSigner},\n      isWriteable: ${isWriteable},\n    )`;
            })
            .join(',\n');

        accountMetas = `  final accounts = [\n${accountMetaList}\n  ];\n`;
    } else {
        accountMetas = '  final accounts = <AccountMeta>[];\n';
    }

    let dataSerializationCode = '';
    if (hasArguments) {
        dataSerializationCode = `  final instructionData = ByteArray(data.toBorsh());\n`;
    } else {
        dataSerializationCode = `  final instructionData = ByteArray.empty();\n`;
    }

    const needsAsync = instructionNode.accounts.some(account => {
        const hasDefaultPda = account.defaultValue && isNode(account.defaultValue, 'pdaValueNode');
        if (!hasDefaultPda) return false;

        const pdaValue = account.defaultValue;
        if (isNode(pdaValue.pda, 'pdaNode')) {
            let canAutoderive = true;
            for (const seed of pdaValue.pda.seeds) {
                if (isNode(seed, 'variablePdaSeedNode')) {
                    const valueSeed = pdaValue.seeds?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;

                    if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                        canAutoderive = true;
                        break;
                    }
                }
            }
            return canAutoderive;
        }
        return false;
    });

    const functionBody = `${pdaResolutionCode}${accountMetas}${dataSerializationCode}
  return Instruction(
    programId: programId ?? Ed25519HDPublicKey.fromBase58(${rootProgramClassName}),
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

    const imports = new Set(['package:borsh_annotation_extended/borsh_annotation_extended.dart', ...pdaImports]);
    if (rootNode) {
        imports.add(`package:${scope.packageName}/${scope.programName}/programs/${rootNode.program.name}.dart`);
    }

    return createFragment(content, Array.from(imports));
}
