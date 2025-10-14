import { deleteDirectory, writeRenderMap } from '@codama/renderers-core';
import { rootNodeVisitor, visit } from '@codama/visitors-core';
import { execSync } from 'child_process';

import { RenderOptions } from '../utils';
import { getRenderMapVisitor } from './getRenderMapVisitor';

export function renderVisitor(
    path: string,
    options: RenderOptions = { deleteFolderBeforeRendering: true, formatCode: true, libraryName: 'lib' },
) {
    return rootNodeVisitor(root => {
        // Delete existing generated folder.
        if (options.deleteFolderBeforeRendering ?? true) {
            deleteDirectory(path);
        }

        const renderMap = visit(root, getRenderMapVisitor(options));
        writeRenderMap(renderMap, path);

        // Format the code using dart format if requested.
        if (options.formatCode ?? true) {
            try {
                console.log('Formatting Dart code...');
                execSync(`dart format "${path}"`, {
                    cwd: process.cwd(),
                    stdio: 'ignore',
                });
                console.log('Dart formatting completed successfully.');
            } catch (error) {
                console.warn(
                    `Warning: Failed to format Dart code. Make sure Dart SDK is installed and accessible.: ${error instanceof Error ? error.message : String(error)}`,
                );
                console.warn('You can manually format the code by running: dart format "' + path + '"');
            }
        }
    });
}
