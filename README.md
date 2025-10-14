# Codama ➤ Renderers ➤ Dart

[![npm][npm-image]][npm-url]
[![npm-downloads][npm-downloads-image]][npm-url]

[npm-downloads-image]: https://img.shields.io/npm/dm/@limechain/renderers-dart.svg?style=flat
[npm-image]: https://img.shields.io/npm/v/@limechain/renderers-dart.svg?style=flat&label=%40codama%2Frenderers-dart
[npm-url]: https://www.npmjs.com/package/@limechain/renderers-dart

This package generates Dart clients from your Codama IDLs. The generated clients are compatible with the [`solana` Dart package](https://pub.dev/packages/solana).

## Installation

```sh
pnpm install @limechain/renderers-dart
```

## Usage

Add the following script to your Codama configuration file.

```json
{
    "idl": "path/to/idl",
    "before": [],
    "scripts": {
        "dart": [
            {
                "from": "@limechain/renderers-dart",
                "args": ["generated"]
            }
        ]
    }
}
```

An object can be passed as a second argument to further configure the renderer. See the [Options](#options) section below for more details.

## Generated Output

The renderer generates a complete Dart package with the following structure:

```
lib/
├── lib.dart              # Main library export file
├── accounts/                   # Account data classes
│
├── instructions/               # Instruction functions
│
├── types/                      # Custom type definitions
│
├── errors/                     # Program error classes
│
├── pdas/                       # PDA derivation functions
│
└── programs/                   # Program constants and metadata
```

## Features

- **Account Serialization/Deserialization**: Automatic Borsh serialization for all account types
- **Instruction Builders**: Type-safe instruction creation with automatic PDA resolution
- **PDA Derivation**: Automatic generation of PDA derivation functions
- **Error Handling**: Strongly-typed program error definitions
- **Type Safety**: Full Dart type safety with null safety support

## Options

The `renderVisitor` accepts the following options.

| Name                    | Type                        | Default | Description                                                                                  |
| ----------------------- | --------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `libraryName`           | `string`                    | `'lib'` | The name of the generated Dart library.                                                      |
| `outputDirectory`       | `string`                    | `'lib'` | The directory where generated files will be placed.                                          |
| `customAccountData`     | `string[]`                  | `[]`    | The names of all `AccountNodes` whose data should be manually written in Dart.               |
| `customInstructionData` | `string[]`                  | `[]`    | The names of all `InstructionNodes` whose data should be manually written in Dart.           |
| `nameTransformers`      | `Partial<NameTransformers>` | `{}`    | An object that enables us to override the names of any generated type, constant or function. |

## Example

Here's an example of using a generated Dart client:

```dart
import 'package:solana/solana.dart';
import 'lib/generated.dart';

void main() async {
  // Create a connection to Solana
  final connection = SolanaClient.mainnet();

  // Create instruction with automatic PDA resolution
  final instruction = await initializeInstruction(
    admin: adminPublicKey,
    initialBonus: 10,
  );

  // Build and send transaction
  final transaction = Transaction(
    instructions: [instruction],
    recentBlockhash: await connection.getLatestBlockhash(),
  );

  await connection.sendTransaction(transaction, [adminKeypair]);
}
```

## Generated PDA Functions

The renderer automatically generates PDA derivation functions:

```dart
// Generated PDA function
Future<Ed25519HDPublicKey> findConfigPda() async {
  return Ed25519HDPublicKey.findProgramAddress(
    seeds: [utf8.encode("program_config")],
    programId: Ed25519HDPublicKey.fromBase58('PROGRAM_ID_HERE'),
  );
}

// Usage
final configPda = await findConfigPda();
```

## Dependencies

Generated Dart code depends on:

- `solana`: For Solana blockchain interaction
- `dart:convert`: For UTF-8 encoding
- `dart:typed_data`: For byte array handling

Make sure to add these to your `pubspec.yaml`:

```yaml
dependencies:
    solana: ^0.30.0
```
