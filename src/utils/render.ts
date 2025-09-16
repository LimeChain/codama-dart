import { dirname as pathDirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { camelCase, kebabCase, pascalCase, snakeCase, titleCase } from '@codama/nodes'
import nunjucks, { ConfigureOptions as NunJucksOptions } from 'nunjucks';

export function dartDocblock(docs: string[]): string {
    if (docs.length <= 0) return '';
    const lines = docs.map(doc => `/// ${doc}`);
    return `${lines.join('\n')}\n`;
}

export const render = (template: string, context?: object, options?: NunJucksOptions): string => {
    let dirname: string;
    // Safely resolve dirname for both ESM and CommonJS environments
    if (typeof import.meta !== 'undefined' && import.meta.url) {
        dirname = pathDirname(fileURLToPath(import.meta.url));
    } else {
        dirname = __dirname;
    }
    const templates = __TEST__ ? join(dirname, '..', '..', 'public', 'templates') : join(dirname, 'templates');
    const env = nunjucks.configure(templates, { autoescape: false, trimBlocks: true, ...options });
    env.addFilter('pascalCase', pascalCase);
    env.addFilter('camelCase', camelCase);
    env.addFilter('snakeCase', snakeCase);
    env.addFilter('kebabCase', kebabCase);
    env.addFilter('titleCase', titleCase);
    env.addFilter('dartDocblock', dartDocblock);
    return env.render(template, context);
};
