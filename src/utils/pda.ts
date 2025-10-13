import { camelCase, isNode, PdaNode, TypeNode } from '@codama/nodes';

import { Fragment, fragment, RenderScope } from './fragment';

export interface PdaSeedInfo {
    dartType?: string;
    encoding: string;
    name?: string;
    type: 'constant' | 'programId' | 'variable';
    value?: string;
}

export function parsePdaSeeds(pdaNode: PdaNode): PdaSeedInfo[] {
    return pdaNode.seeds.map(seed => {
        if (isNode(seed, 'constantPdaSeedNode')) {
            if (isNode(seed.value, 'programIdValueNode')) {
                return {
                    encoding: 'programId.bytes',
                    type: 'programId',
                };
            }

            // Handle different constant types
            const value = isNode(seed.value, 'stringValueNode')
                ? `"${seed.value.string}"`
                : isNode(seed.value, 'numberValueNode')
                  ? seed.value.number.toString()
                  : 'null';

            return {
                encoding: getEncodingForType(seed.type, value),
                type: 'constant',
                value,
            };
        }

        if (isNode(seed, 'variablePdaSeedNode')) {
            const name = camelCase(seed.name);
            const dartType = getDartTypeForSeed(seed.type);

            return {
                dartType,
                encoding: getEncodingForType(seed.type, name),
                name,
                type: 'variable',
            };
        }

        throw new Error(`Unsupported seed type: ${(seed as TypeNode).kind}`);
    });
}

function getDartTypeForSeed(typeNode: TypeNode): string {
    // This would need to integrate with the existing type system
    // For now, return basic types
    if (typeNode.kind === 'stringTypeNode') return 'String';
    if (typeNode.kind === 'publicKeyTypeNode') return 'Ed25519HDPublicKey';
    if (typeNode.kind === 'numberTypeNode') return 'int';
    return 'dynamic';
}

function getEncodingForType(typeNode: TypeNode, value: string): string {
    if (typeNode.kind === 'stringTypeNode') {
        return `utf8.encode(${value})`;
    }
    if (typeNode.kind === 'publicKeyTypeNode') {
        return `${value}.bytes`;
    }
    if (typeNode.kind === 'numberTypeNode') {
        // Handle different number formats
        return `Uint8List.fromList([${value}])`;
    }
    return value;
}

export function generatePdaFunction(pdaNode: PdaNode, scope: Pick<RenderScope, 'nameApi'>): Fragment {
    const seeds = parsePdaSeeds(pdaNode);
    const functionName = scope.nameApi.pdaFindFunction(pdaNode.name);
    const variableSeeds = seeds.filter(s => s.type === 'variable');

    const hasVariableSeeds = variableSeeds.length > 0;
    const parameters = hasVariableSeeds ? variableSeeds.map(s => `required ${s.dartType} ${s.name}`).join(', ') : '';

    const seedExpressions = seeds.map(seed => {
        switch (seed.type) {
            case 'constant':
                return seed.encoding;
            case 'variable':
                return seed.encoding;
            case 'programId':
                return 'programId.bytes';
            default:
                throw new Error(`Unknown seed type: ${(seed).type}`);
        }
    });

    // const programAddress = pdaNode.programId || 'programId';

    return fragment`
/// Finds the PDA address for ${pdaNode.name}
static Future<Ed25519HDPublicKey> ${functionName}(${parameters}${hasVariableSeeds ? ', ' : ''}Ed25519HDPublicKey programId) async {
  return Ed25519HDPublicKey.findProgramAddress(
    seeds: [${seedExpressions.join(', ')}],
    programId: programId,
  );
}`;
}
