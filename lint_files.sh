#!/bin/bash

LUACHECK_ARGS="--config ./.luacheckrc $1"
LUACHECK_PATHS="$2"
LUACHECK_CAPTURE="$3"
LUACHECK_EXTRA_LIBS="$4"
IGNORED_SCRIPTS="$5"

yarn install

# build .luacheckrc file
RESOURCES_PATH=$LUACHECK_PATHS IGNORED_SCRIPTS=$IGNORED_SCRIPTS yarn build

[ -f "/github/workspace/.luacheckrc" ] || { echo "❌ File .luacheckrc not found"; }

echo "outfile => $LUACHECK_CAPTURE"

EXIT_CODE=0

if [[ ! -z "$LUACHECK_CAPTURE" ]]; then
  echo "exec => luacheck $LUACHECK_ARGS $LUACHECK_PATH 2>>$LUACHECK_CAPTURE"
  luacheck $LUACHECK_ARGS $LUACHECK_PATH >$LUACHECK_CAPTURE 2>&1 || true
  
  echo "exec => luacheck $LUACHECK_ARGS --formatter default $LUACHECK_PATH"
  luacheck $LUACHECK_ARGS --formatter default $LUACHECK_PATH || EXIT_CODE=$?
else
  echo "exec => luacheck $LUACHECK_ARGS $LUACHECK_PATH"
  luacheck $LUACHECK_ARGS $LUACHECK_PATH || EXIT_CODE=$?
fi

echo "exit => $EXIT_CODE"
if [ $EXIT_CODE -ge 2 ]; then
 exit $EXIT_CODE
fi