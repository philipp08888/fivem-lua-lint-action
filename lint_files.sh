#!/bin/bash

LUACHECK_ARGS="--config .luacheckrc $1"
LUACHECK_PATHS="$2"
LUACHECK_CAPTURE="$3"
LUACHECK_EXTRA_LIBS="$4"
IGNORED_SCRIPTS="$5"

[ -f "/github/workspace/package.json" ] || { echo "❌ File package.json not found"; }


ls -la
yarn install

# build .luacheckrc file
RESOURCES_FOLDER_PATH=$LUACHECK_PATHS IGNORED_SCRIPT_LIST=$IGNORED_SCRIPTS yarn build

[ -f "/github/workspace/.luacheckrc" ] || { echo "❌ File .luacheckrc not found"; }
ls -la
echo "outfile => $LUACHECK_CAPTURE"

EXIT_CODE=0

if [[ ! -z "$LUACHECK_CAPTURE" ]]; then
  echo "exec => luacheck $LUACHECK_ARGS $LUACHECK_PATHS 2>>$LUACHECK_CAPTURE"
  luacheck $LUACHECK_ARGS $LUACHECK_PATHS >$LUACHECK_CAPTURE 2>&1 || true
  
  echo "exec => luacheck $LUACHECK_ARGS --formatter default $LUACHECK_PATHS"
  luacheck $LUACHECK_ARGS --formatter default $LUACHECK_PATHS || EXIT_CODE=$?
else
  echo "exec => luacheck $LUACHECK_ARGS $LUACHECK_PATHS"
  luacheck $LUACHECK_ARGS $LUACHECK_PATHS || EXIT_CODE=$?
fi

echo "exit => $EXIT_CODE"
if [ $EXIT_CODE -ge 2 ]; then
 exit $EXIT_CODE
fi