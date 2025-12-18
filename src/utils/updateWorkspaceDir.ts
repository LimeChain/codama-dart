import fs from 'fs';

export function updateWorkspaceDir(workspaceOutDir: string | undefined, packageName: string): string {
    const workspaceDir = workspaceOutDir && workspaceOutDir.trim() ? workspaceOutDir.trim() : 'workspace';

    if (!fs.existsSync(workspaceDir)) {
        // Create the workspace with no packages yet, create pubspec.yaml with no packages yet
        fs.mkdirSync(workspaceDir, { recursive: true });
        fs.writeFileSync(`${workspaceDir}/pubspec.yaml`, pubspecContent, { encoding: 'utf8', flag: 'w' });
    }
    // Update pubspec.yaml to include the new package
    const pubspecPath = `${workspaceDir}/pubspec.yaml`;
    let pubspec = fs.readFileSync(pubspecPath, 'utf8');
    const packageEntry = `  - ${packageName}\n`;

    if (!pubspec.includes(packageEntry)) {
        const lines = pubspec.split('\n');
        const workspaceIndex = lines.findIndex(line => line.trim() === 'workspace:');
        if (workspaceIndex !== -1) {
            lines.splice(workspaceIndex + 1, 0, packageEntry);
            pubspec = lines.join('\n');
            fs.writeFileSync(pubspecPath, pubspec, { encoding: 'utf8', flag: 'w' });
        }
    }

    return workspaceDir;
}

const pubspecContent = `
name: workspace
publish_to: none
environment:
  sdk: ">=3.5.0 <4.0.0"
workspace:
`;
