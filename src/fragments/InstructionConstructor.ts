import { pascalCase, snakeCase } from "@codama/nodes";

type Arg = {
    name: string;   
};

// Generates the Dart constructor argument and initializer fragment for the Dart representation of Solana instruction.
export default function instructionConstructorFragment(
    instructionName: string,
    accounts: any[],
    args: Arg[]
) {
    let fragment = `${pascalCase(instructionName)}Instruction({\n`;
    let defaultAccounts: Record<string, string> = {};

    for (const account of accounts) {
        // Handle Default Value for nodes that have them and they are public keys
        if (account.defaultValue && account.defaultValue.kind === "publicKeyValueNode") {
            let accountName = snakeCase(account.name);
            fragment += `Ed25519HDPublicKey? ${accountName},\n`;
            defaultAccounts[accountName] = (account.defaultValue).publicKey;

        } else if (account.isOptional) {
            fragment += `  this.${snakeCase(account.name)},\n`;
        } else {
            fragment += `  required this.${snakeCase(account.name)},\n`;
        }
        if (account.isSigner === "either") {
            fragment += `  this.${snakeCase(account.name)}IsSigner = false,\n`;
        }
    }

    if (args && args.length > 0) {
        for (const arg of args) {
            fragment += `  required this.${snakeCase(arg.name)},\n`;
        }
    }

    fragment += `})`;

    // If there are default accounts, set each default account to its default value if not provided
    if (Object.keys(defaultAccounts).length > 0) { 
        fragment += ` : \n`;
        const defaults = Object.entries(defaultAccounts).map(
            ([key, value]) => `${key} = ${key} ?? Ed25519HDPublicKey.fromBase58('${value}')`
        ).join(',\n  ');
        fragment += `  ${defaults};\n`;
    } else {
        fragment += `;\n`;
    }

    return fragment;
}