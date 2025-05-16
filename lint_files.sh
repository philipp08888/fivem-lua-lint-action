#!/bin/bash

LUACHECK_ARGS="--config ./github/workspace/.luacheckrc $1"
LUACHECK_PATHS="$2"
LUACHECK_CAPTURE="$3"
LUACHECK_EXTRA_LIBS="$4"
IGNORED_SCRIPTS="$5"

yarn install

OLD_DIR=$(pwd)

echo $OLD_DIR

# build .luacheckrc file
RESOURCES_PATH=$LUACHECK_PATHS IGNORED_SCRIPTS=$IGNORED_SCRIPTS yarn build
[ -f "/github/workspace/.luacheckrc" ] || { echo "❌ File .luacheckrc not found"; exit 1; }

T=$(ls -la)
echo $T

echo "outfile => $LUACHECK_CAPTURE_OUTFILE"

if [[ ! -z "$LUACHECK_CAPTURE_OUTFILE" ]]; then
  echo "exec => luacheck $LUACHECK_ARGS $LUACHECK_PATH 2>>$LUACHECK_CAPTURE_OUTFILE"
  luacheck $LUACHECK_ARGS $LUACHECK_PATH >$LUACHECK_CAPTURE_OUTFILE 2>&1 || true
  
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