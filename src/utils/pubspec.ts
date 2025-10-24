// Constants for Git-based dependencies
const REPO_URL = 'https://github.com/vlady-kotsev/borsh_annotation_extended.git';
const REPO_REF = 'b6b2c80d3b198fc2af9fc74d78fcdc86c23ed7cd';

export function generatePubspec(
    packageName: string,
    options: {
        author?: string;
        dependencies?: Record<string, string>;
        description?: string;
        devDependencies?: Record<string, string>;
        homepage?: string;
        version?: string;
    } = {},
): string {
    const {
        description = 'Generated Dart package for Solana program interaction',
        version = '1.0.0',
        author,
        homepage,
        dependencies = {},
        devDependencies = {},
    } = options;

    const defaultDevDependencies = {
        build_runner: '^2.4.7',
        lints: '^3.0.0',
        test: '^1.24.0',
        ...devDependencies,
    };

    const sections = [`name: ${packageName}`, `description: ${description}`, `version: ${version}`, `publish_to: none`];

    if (author) {
        sections.push(`author: ${author}`);
    }

    if (homepage) {
        sections.push(`homepage: ${homepage}`);
    }

    sections.push('', 'environment:', '  sdk: ">=3.0.0 <4.0.0"');

    // Add git-based dependencies
    sections.push('', 'dependencies:');

    // Borsh dependency
    sections.push('  borsh: 0.3.2');

    // Borsh annotation dependency
    sections.push('  borsh_annotation_extended:', '    git:', `      url: ${REPO_URL}`, `      ref: ${REPO_REF}`);

    // Solana dependency
    sections.push('  solana: 0.31.2');

    // Add any additional dependencies
    Object.entries(dependencies).forEach(([name, version]) => {
        sections.push(`  ${name}: ${version}`);
    });

    if (Object.keys(defaultDevDependencies).length > 0) {
        sections.push('', 'dev_dependencies:');
        Object.entries(defaultDevDependencies).forEach(([name, version]) => {
            sections.push(`  ${name}: ${version}`);
        });
    }

    return sections.join('\n') + '\n';
}
