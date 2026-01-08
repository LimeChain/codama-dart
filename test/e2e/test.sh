#!/usr/bin/env bash
set -eux

function test_project() {
    node test/e2e/generate.cjs $1 true
    cd test/e2e/dart_generated_workspace/$1

    dart analyze

    cd ../../../..
}

function test_anchor_project() {
    node test/e2e/generate-anchor.cjs $1 true
    cd test/e2e/dart_generated_workspace/$1

    dart analyze

    cd ../../../..
}

function test_anchor_without_workspace() {
    node test/e2e/generate-anchor.cjs "$1"
    cd test/e2e/dart_generated_workspace/${1}_generated

    dart analyze

    cd ../../../..
}

function test_project_without_workspace() {
    node test/e2e/generate.cjs "$1"
    cd test/e2e/dart_generated_workspace/${1}_generated

    dart analyze

    cd ../../../..
}

test_project dummy
test_project system
test_project memo
test_anchor_project anchor
test_anchor_project data_structures
test_project_without_workspace system
test_anchor_without_workspace anchor