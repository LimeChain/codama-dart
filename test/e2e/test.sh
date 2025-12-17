#!/usr/bin/env bash
set -eux

function test_project() {
    node test/e2e/generate.cjs $1 
    cd test/e2e/dart_generated_workspace/$1

    dart analyze

    cd ../../../..
}

function test_anchor_project() {
    node test/e2e/generate-anchor.cjs $1
    cd test/e2e/dart_generated_workspace/$1

    dart analyze

    cd ../../../..
}

test_project dummy
test_project system
test_project memo
test_anchor_project anchor
test_anchor_project data_structures