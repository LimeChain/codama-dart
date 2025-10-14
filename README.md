# Codama ➤ Renderers ➤ Dart

[![npm][npm-image]][npm-url]
[![npm-downloads][npm-downloads-image]][npm-url]

[npm-downloads-image]: https://img.shields.io/npm/dm/@limechain/renderers-dart.svg?style=flat
[npm-image]: https://img.shields.io/npm/v/@limechain/renderers-dart.svg?style=flat&label=%40limechain%2Frenderers-dart
[npm-url]: https://www.npmjs.com/package/@limechain/renderers-dart

This package generates Dart clients from your Codama IDLs. The generated clients are compatible with the [`solana` Dart package](https://pub.dev/packages/solana).

## 1. Pre-requisites

### 1.1 Install Codama

```
pnpm install -g codama
```

### 1.2. Install Dart

https://dart.dev/get-dart

## 2. Renderer Installation

```sh
pnpm install @limechain/renderers-dart
```

## 3. Usage

### 3.1. Add the following script into `codama.json`.

```json
{
    "idl": "path/to/idl",
    "before": [],
    "scripts": {
        "dart": [
            {
                "from": "@limechain/renderers-dart",
                "args": [
                    "generated",
                    {
                        "libraryName": "myProject",
                        "deleteFolderBeforeRendering": true,
                        "formatCode": true
                    }
                ]
            }
        ]
    }
}
```

An object can be passed as a second argument to further configure the renderer. See the [Options](#options) section below for more details.

### 3.2. Run code generation

```sh
pnpm codama run dart
```

### 3.3. Run Dart Borsh code generation

```sh
  cd generated
  dart pub get
  dart run build_runner build
```

## 4. Generated Output

The renderer generates a complete Dart package with the following structure:

```
lib/
├── lib.dart              # Main library export file
|
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

## 5. Features

- **Account Serialization/Deserialization**: Automatic Borsh serialization for all account types
- **Instruction Builders**: Type-safe instruction creation with automatic PDA resolution
- **PDA Derivation**: Automatic generation of PDA derivation functions
- **Error Handling**: Strongly-typed program error definitions
- **Type Safety**: Full Dart type safety with null safety support

## 6. Options

The `renderVisitor` accepts the following options.

| Name                          | Type     | Default | Description                                                     |
| ----------------------------- | -------- | ------- | --------------------------------------------------------------- |
| `libraryName`                 | `string` | `'lib'` | The name of the generated Dart library.                         |
| `outputDirectory`             | `string` | `'lib'` | The directory where generated files will be placed.             |
| `deleteFolderBeforeRendering` | `bool`   | `true`  | Flag for deleting the output folder before generating it again. |
| `formatCode`                  | `bool`   | `true`  | Flag for formatting the Dart code after generation              |

<hr/>
