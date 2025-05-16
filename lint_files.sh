#!/bin/bash

LUACHECK_ARGS="--config ./github/workspace/.luacheckrc $1"
LUACHECK_PATHS="$2"
LUACHECK_CAPTURE="$3"
LUACHECK_EXTRA_LIBS="$4"
IGNORED_SCRIPTS="$5"

yarn install

OLD_DIR=$(pwd)

echo $OLD_DIR | grep ".luacheckrc"

# build .luacheckrc file
RESOURCES_PATH=$LUACHECK_PATHS IGNORED_SCRIPTS=$IGNORED_SCRIPTS yarn build
wait

T=$(ls -la)
echo $T

[ -f "/github/workspace/.luacheckrc" ] || { echo "❌ File .luacheckrc not found"; }
