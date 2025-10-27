import { CamelCaseString, isNode, PdaNode, PdaSeedValueNode, StandaloneValueNode } from '@codama/nodes';

import { Fragment } from './fragment';
import { RenderScope } from './options';
import { generateDartSeedSerializationCode, getTypeInfo } from './types';

/**
 * Generates Dart code for PDA seeds based on a PDA node and its seed values
 */
export function generatePdaSeeds(
    pdaNode: PdaNode,
    pdaSeedValues: PdaSeedValueNode[] | undefined,
    scope: RenderScope,
): string[] {
    return pdaNode.seeds.map(seed => {
        if (isNode(seed, 'constantPdaSeedNode')) {
            if (isNode(seed.value, 'stringValueNode')) {
                return `utf8.encode("${seed.value.string}")`;
            }
            if (isNode(seed.value, 'programIdValueNode')) {
                return `programId.bytes`;
            }
            if (isNode(seed.value, 'bytesValueNode')) {
                const byteArray = Array.from(Buffer.from(seed.value.data, 'hex'));
                return `Uint8List.fromList([${byteArray.join(', ')}])`;
            }
            if (seed.value.kind === 'arrayValueNode' && seed.value.items) {
                const bytes = seed.value.items.map((item: StandaloneValueNode) =>
                    isNode(item, 'numberValueNode') ? item.number : 0,
                );
                return `Uint8List.fromList([${bytes.join(', ')}])`;
            }
        }
        if (isNode(seed, 'variablePdaSeedNode')) {
            const valueSeed = pdaSeedValues?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;

            if (valueSeed && isNode(valueSeed, 'accountValueNode')) {
                const paramName = valueSeed.name;
                return `${paramName}.toByteArray()`;
            }
            if (valueSeed && isNode(valueSeed, 'argumentValueNode')) {
                const fieldSerializationCode = generateDartSeedSerializationCode(seed, scope.nameApi);
                return fieldSerializationCode;
            }

            const seedName = scope.nameApi.instructionField(seed.name);
            return `${seedName}.toByteArray()`;
        }
        return 'utf8.encode("fallback")';
    });
}

/**
 * Creates a PDA derivation function fragment for a given account
 */
export function createInlinePdaFile(
    accountName: string,
    pdaNode: PdaNode,
    pdaSeedValues: PdaSeedValueNode[] | undefined,
    programPublicKey: string | undefined,
    scope: Pick<RenderScope, 'definedTypes' | 'nameApi' | 'packageName' | 'programName'>,
    asPage: <TFragment extends Fragment | undefined>(fragment: TFragment) => TFragment,
): Fragment | undefined {
    const { nameApi, programName, packageName } = scope;
    const functionName = `derive${accountName.charAt(0).toUpperCase() + accountName.slice(1)}Pda`;
    const seeds = generatePdaSeeds(pdaNode, pdaSeedValues, scope);

    const parameters: string[] = [];
    let programClassName: string = '';

    programClassName = nameApi.programType(programName as CamelCaseString);

    pdaNode.seeds.forEach(seed => {
        if (isNode(seed, 'variablePdaSeedNode')) {
            const valueSeed = pdaSeedValues?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;
            if (valueSeed && (isNode(valueSeed, 'accountValueNode') || isNode(valueSeed, 'argumentValueNode'))) {
                const paramName = valueSeed.name;
                const dartType = getTypeInfo(seed.type, scope).dartType;
                parameters.push(`${dartType} ${paramName}`);
            }
        }
    });

    const parameterList = parameters.length > 0 ? parameters.join(', ') : '';
    const programIdValue =
        programClassName && programClassName !== ''
            ? `Ed25519HDPublicKey.fromBase58(${programClassName}.programId)`
            : programPublicKey
              ? `Ed25519HDPublicKey.fromBase58('${programPublicKey}')`
              : 'PROGRAM_ID_HERE';

    const content = `/// Returns the PDA address for ${accountName}
Future<Ed25519HDPublicKey> ${functionName}(${parameterList}) async {
  return Ed25519HDPublicKey.findProgramAddress(
    seeds: [${seeds.join(', ')}],
    programId: ${programIdValue},
  );
}`;

    const imports = new Set(['dart:convert', 'package:borsh_annotation_extended/borsh_annotation_extended.dart']);
    if (programClassName) {
        imports.add(`package:${packageName}/${programName}/programs/${programName}.dart`);
    }

    const fragment: Fragment = {
        content,
        imports,
    };

    return asPage(fragment);
}
