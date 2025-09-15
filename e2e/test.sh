#!/usr/bin/env bash
set -eux

function print_dart_errors() {
    local project="$1"
    local log_file="${2:-analyze.log}"
    RED='\033[0;31m'
    NC='\033[0m'
    if grep -q 'error ' "$log_file"; then
        echo ""
        echo -e "${RED}==================== Dart Analysis Errors in $project ====================${NC}"
        echo ""
        grep 'error ' "$log_file" | sed 's/^/    /'
        echo ""
        echo -e "${RED}====================================================================${NC}"
        echo ""
        echo "Dart analysis found errors in $project"
        exit 1
    fi
}

function test_project() {
    ./e2e/generate.cjs $1 
    cd e2e/$1

    # Run dart analyze and fail only if there are errors
    dart analyze > analyze.log || true
    print_dart_errors "$1" analyze.log

    cd ../..
}

function test_anchor_project() {
    ./e2e/generate-anchor.cjs $1 
    cd e2e/$1
    cd ../..
}

test_project dummy
test_project system
test_project memo
# test_project meteora  # TODO: uncomment after some internal fixes
test_anchor_project anchor