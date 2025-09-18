# Codama ➤ Renderers ➤ Dart

This package provides a Solana Dart client renderer for [Codama](https://github.com/codama-idl/codama)  that generates Dart client code from Solana program IDL files.

This tool is in beta, so please report any issues or feedback.

> For a full example project using this renderer, see [codama-dart-example](https://github.com/LimeChain/codama-dart-examples).

## Installation

```sh
pnpm install codama-dart
```

## Using with Codama configuration
When you have installed Codama IDL, you can use as a renderer plugin via Codama's configuration system.
Just add the following script to your Codama configuration file.


```json
{
  "scripts": {
      "dart": {
          "from": "@codama/renderers-dart",
          "args": [
              "clients/dart/src/generated",
              {
                  "crateFolder": "clients/dart",
                  "formatCode": true
              }
          ]
      }
  }
}
```
For more details on configuring Codama using a config file, see the official [Codama CLI documentation](https://github.com/codama-idl/codama/blob/main/packages/cli/README.md)


## Using programmatically in Node.js
You can also use this package directly in your own Node.js scripts. This approach is ideal if you want to generate Dart clients programmatically, giving you full control over the generation process and output options. Simply import the `renderVisitor` function and use it as shown below:

```ts
// create-codama-client.js
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import renderVisitor from 'codama-dart';

import path from 'path';
import fs from 'fs';

// Load one Anchor IDL
const idl = JSON.parse(
  fs.readFileSync('target/idl/anchor_gamble.json', 'utf8')
);

// Define program name and output directory
const programName = 'anchor_gamble';
const outDir = path.join('clients', 'dart', 'generated', programName);

// Generate the Dart client
const codama = createFromRoot(rootNodeFromAnchor(idl as any));
codama.accept(renderVisitor(outDir, options));
```

## Generate file directory structure

```
.
├── accounts
│   └── array_account.dart
├── instructions
│   └── array_initialize.dart
├── types
│   ├── fixed_array_account.dart
│   ├── nested_vec_account.dart
│   └── string_account.dart
├── errors
│   └── array_errors.dart
│
├── accounts.dart
├── errors.dart
├── instructions.dart
├── programs.dart
├── shared.dart
├── types.dart
├── lib.dart
└── mod.dart
```

## Dependencies

```yaml
dependencies:
    solana: ^0.31.2+1
```

## Examples

### Create client variable

```dart
RpcClient createSolanaClient() {
  return RpcClient('http://localhost:8899');
}
```

### Instructions

```dart
import 'package:solana/solana.dart';
import 'dart:convert';
// Import the generated client `lib.dart` which exports all of the generated properties
import '../../../generated/anchor_gamble/lib.rs';

void initialize() async {
  // Signer mnemonic file
  final String mnemonic = File('wallet.mnemonic').readAsStringSync();

  // Signer keypair
  final Ed25519HDKeyPair payer = await Ed25519HDKeyPair.fromMnemonic(mnemonic);

  // Create client
  final RpcClient client = createSolanaClient();

  // Get programId from the generated client
  final gambleProgramId = gamble.AnchorGambleProgram.programId;

  final systemProgram = Ed25519HDPublicKey.fromBase58(SystemProgram.programId);
  final gambleCost = 1000000; // Example cost, adjust as needed

  try {
    final configSeeds = [utf8.encode('config')];

    final config = await Ed25519HDPublicKey.findProgramAddress(
      seeds: configSeeds,
      programId: gambleProgramId,
    );

    final rewardPoolSeeds = [utf8.encode('reward_pool')];

    final rewardPool = await Ed25519HDPublicKey.findProgramAddress(
      seeds: rewardPoolSeeds,
      programId: gambleProgramId,
    );

    // Use the Instruction Class method from client that is generated for you
    final initializeIx = InitializeInstruction(
      config: config,
      reward_pool: rewardPool,
      admin: payer.publicKey,
      system_program: systemProgram,
      gamble_cost: BigInt.from(gambleCost),
    ).toInstruction();

    final message = Message(instructions: [initializeIx]);
    final signature = await client.signAndSendTransaction(message, [payer]);

    print("Transaction signature to initialize a gamble instruction: $signature");
  } catch (e) {
    print('Error signing and sending transaction: $e');
  }
}
```

### Accounts

```dart
import 'package:solana/solana.dart';
import 'dart:convert';
// Import the generated client `lib.dart` which exports all of the generated properties
import '../../../generated/anchor_gamble/lib.dart';

void getGambleState(RpcClient client, Ed25519HDPublicKey programId) async {
  try {
    final configSeeds = [utf8.encode('config')];

    final configAcc = await Ed25519HDPublicKey.findProgramAddress(
      seeds: configSeeds,
      programId: programId,
    );

    // Use the generated Account Class in the client `Config` and use its method to fetch from blockchain and access the deserialized property
    final gamleAccount = await Config.fetch(client, configAcc);

    // Access the properties from this Class
    print('Admin: ${gamleAccount.admin}');
    print('Gamble Cost: ${gamleAccount.gamble_cost}');
    print('Config Bump: ${gamleAccount.config_bump}');
    print('Reward Pool Bump: ${gamleAccount.reward_pool_bump}');

  } catch (e) {
    print('Error fetching Gamble State: $e');
  }
}
```

### Types

```dart
// Structs

final Ed25519HDKeyPair arrayAcc = await Ed25519HDKeyPair.fromMnemonic(arrayMnemonic);
// Get the data for that account
final arrayAccount = await ArrayAccount.fetch(client, arrayAcc.publicKey);
```

```dart
// Enum (Structs following the sealed class pattern)

final Ed25519HDKeyPair enumAcc = await Ed25519HDKeyPair.fromMnemonic(enumMnemonic);

final enumAccount = await EnumAccount.fetch(client, enumAcc.publicKey);
if (enumValue is VariantA) {
    print('VariantA(value0: ${enumValue.value0}, value1: ${enumValue.value1})');
  } else if (enumValue is VariantB) {
    print('VariantB(x: ${enumValue.x}, y: ${enumValue.y})');
  } else if (enumValue is VariantC) {
    print('VariantC');
  ....
```

### Errors

```dart
try {
  ...some instruction call here
} catch (e) {
  // You take that from the generated `errors` folder and you find your corresponding Error Class
  final dsError = DataStructuresError.fromSolanaErrorString(e);
  if (dsError != null) {
    print('Custom program error: $dsError');
    // You can also check the type:
    if (dsError is StringTooLongError) {
      print('String was too long!');
    }
  } else {
    print('Other error: $e');
  }
}
```

## Program ID

The Program ID is generated based on the Program address provided in the IDL. If it is not present in the IDL, it needs to be manually filled in.

## Description

The generated code uses the Solana Dart SDK along with Borsh serialization methods.

## Not Supported Data Types

- FixedArray with u8 are not supported -> `[u8; 2]`, arrays with u8 acts as an `BytesTypeNode`, which means it is automatically set to size 8 instead of 2.

- `Vec<Option<SomeStructHere>>` -> Not supported

- Fixed Nested Arrays -> `[[u32; 3]; 2]` use `Vec<Vec<u32>>` instead and apply constraints using InitSpace macros -> `#[max_len(3, 2)]`