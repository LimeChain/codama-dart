import { CamelCaseString, isNode, PdaNode, PdaSeedValueNode, StandaloneValueNode } from '@codama/nodes';

import { Fragment } from './fragment';
import { RenderScope } from './options';

/**
 * Generates Dart code for PDA seeds based on a PDA node and its seed values
 */
export function generatePdaSeeds(
    pdaNode: PdaNode,
    pdaSeedValues: PdaSeedValueNode[] | undefined,
    nameApi: RenderScope['nameApi'],
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
                // Convert byte array to Uint8List
                const byteArray = Array.from(Buffer.from(seed.value.data, 'hex'));
                return `Uint8List.fromList([${byteArray.join(', ')}])`;
            }
            if (seed.value.kind === 'arrayValueNode' && seed.value.items) {
                // Handle array of bytes like [108, 101, 32, 115, 101, 101, 100]
                const bytes = seed.value.items.map((item: StandaloneValueNode) =>
                    isNode(item, 'numberValueNode') ? item.number : 0,
                );
                return `Uint8List.fromList([${bytes.join(', ')}])`;
            }
        }
        if (isNode(seed, 'variablePdaSeedNode')) {
            const valueSeed = pdaSeedValues?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;

            if (valueSeed && (isNode(valueSeed, 'accountValueNode') || isNode(valueSeed, 'argumentValueNode'))) {
                const paramName = valueSeed.name;
                return `${paramName}.toByteArray()`;
            }

            const seedName = nameApi.instructionField(seed.name);
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
    nameApi: RenderScope['nameApi'],
    programPublicKey: string | undefined,
    programName: string | undefined,
    asPage: <TFragment extends Fragment | undefined>(
        fragment: TFragment,
        pageOptions?: { libraryName?: string },
    ) => TFragment,
): Fragment | undefined {
    const functionName = `derive${accountName.charAt(0).toUpperCase() + accountName.slice(1)}Pda`;
    const seeds = generatePdaSeeds(pdaNode, pdaSeedValues, nameApi);

    const parameters: string[] = [];
    let programClassName: string = '';
    if (programName) {
        programClassName = nameApi.programType(programName as CamelCaseString);
    }


    pdaNode.seeds.forEach(seed => {
        if (isNode(seed, 'variablePdaSeedNode')) {
            const valueSeed = pdaSeedValues?.find((s: PdaSeedValueNode) => s.name === seed.name)?.value;
            if (valueSeed && (isNode(valueSeed, 'accountValueNode') || isNode(valueSeed, 'argumentValueNode'))) {
                // This is either an account or argument parameter
                const paramName = valueSeed.name;
                parameters.push(`Ed25519HDPublicKey ${paramName}`);
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

    const imports = new Set(['package:solana/solana.dart', 'dart:typed_data']);
    if (programClassName) {
        imports.add(`../programs/${programName}.dart`);
    }

    const fragment: Fragment = {
        content,
        imports,
    };

    return asPage(fragment);
}
