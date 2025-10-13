export function generatePubspec(packageName: string, options: {
    author?: string;
    dependencies?: Record<string, string>;
    description?: string;
    devDependencies?: Record<string, string>;
    homepage?: string;
    version?: string;
} = {}): string {
    const {
        description = 'Generated Dart package for Solana program interaction',
        version = '1.0.0',
        author,
        homepage,
        dependencies = {},
        devDependencies = {}
    } = options;

    // Default dependencies for Solana/blockchain development with Borsh serialization
    const defaultDependencies = {
        'borsh': '^0.3.2',
        'borsh_annotation': '^0.3.1',
        'solana': '^1.0.0',
        ...dependencies
    };

    const defaultDevDependencies = {
        'build_runner': '^2.4.7',
        'lints': '^3.0.0',
        'test': '^1.24.0',
        ...devDependencies
    };

    const sections = [
        `name: ${packageName}`,
        `description: ${description}`,
        `version: ${version}`,
        `publish_to: none`
    ];

    if (author) {
        sections.push(`author: ${author}`);
    }

    if (homepage) {
        sections.push(`homepage: ${homepage}`);
    }

    sections.push(
        '',
        'environment:',
        "  sdk: '>=3.0.0 <4.0.0'"
    );

    if (Object.keys(defaultDependencies).length > 0) {
        sections.push('', 'dependencies:');
        Object.entries(defaultDependencies).forEach(([name, version]) => {
            sections.push(`  ${name}: ${version}`);
        });
    }

    if (Object.keys(defaultDevDependencies).length > 0) {
        sections.push('', 'dev_dependencies:');
        Object.entries(defaultDevDependencies).forEach(([name, version]) => {
            sections.push(`  ${name}: ${version}`);
        });
    }

    return sections.join('\n') + '\n';
}