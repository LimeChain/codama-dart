import { deleteDirectory, writeRenderMap } from '@codama/renderers-core';
import { rootNodeVisitor, visit } from '@codama/visitors-core';

import { RenderOptions } from '../utils';
import { getRenderMapVisitor } from './getRenderMapVisitor';

export function renderVisitor(path: string, options: RenderOptions = {}) {
    return rootNodeVisitor(root => {
        // Delete existing generated folder.
        if (options.deleteFolderBeforeRendering ?? true) {
            deleteDirectory(path);
        }

        // Render the new files.
        const renderMap = visit(root, getRenderMapVisitor(options));

        // Format the code using dart format if requested.
        // For Dart code, we could use `dart format` command here in the future
        // For now, we'll skip formatting and rely on the user's IDE/toolchain

        writeRenderMap(renderMap, path);
    });
}
