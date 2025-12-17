#!/usr/bin/env -S node
const { createFromRoot } = require('codama');
const { rootNodeFromAnchor } = require('@codama/nodes-from-anchor');

const path = require('node:path');
const process = require('node:process');

const { readJson } = require('@codama/renderers-core');

const { renderVisitor } = require('../../dist/index.node.cjs');

async function main() {
    const project = process.argv.slice(2)[0] ?? undefined;
    if (project === undefined) {
        throw new Error('Project name is required.');
    }

    await generateProject(project);
}

async function generateProject(project) {
    console.log(`Generating code for project: ${project}`);
    const idl = readJson(path.join(__dirname, project, 'idl.json'));
    const codama = createFromRoot(rootNodeFromAnchor(idl));
    const outDir = project;
    const workspaceDir = path.join(__dirname, 'dart_generated_workspace');
    codama.accept(renderVisitor(outDir, {
        enableWorkspace: true,
        workspaceOutDir: workspaceDir,
    }));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
