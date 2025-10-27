import { env } from 'node:process';

import { defineConfig, Format, Options as TsupConfig } from 'tsup';

export default defineConfig([getBuildConfig('cjs'), getBuildConfig('esm')]);

function getBuildConfig(format: Format): TsupConfig {
    return {
        define: {
            __ESM__: `${format === 'esm'}`,
            __NODEJS__: 'true',
            __TEST__: 'false',
            __VERSION__: `"${env.npm_package_version}"`,
        },
        entry: ['./src/index.ts'],
        esbuildOptions(options) {
            options.define = { ...options.define, 'process.env.NODE_ENV': 'process.env.NODE_ENV' };
        },
        format,
        outExtension({ format }) {
            return { js: `.node.${format === 'cjs' ? 'cjs' : 'mjs'}` };
        },
        platform: 'node',
        publicDir: true,
        pure: ['process'],
        sourcemap: true,
    };
}
