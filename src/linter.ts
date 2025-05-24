import { NativeResponse, RuntimeNativesClient } from "./clients";
import {
  additionalClientFunctions,
  additionalServerFunctions,
  env,
  LuaUtils,
  LuaWriter,
  manifestVariables,
  Utils
} from "./utils";

function mergeAndSortNatives(
  natives: NativeResponse,
  nativesCfx: NativeResponse
) {
  const mergedNatives: NativeResponse = { ...natives, ...nativesCfx };
  const namespaces = Object.values(mergedNatives);
  const nativesFromAllNamespaces = namespaces
    .flatMap(hash => Object.values(hash).filter(native => native !== null))
    .filter(n => !!n?.name);

  const serverNatives = nativesFromAllNamespaces.filter(
    native => native?.apiset === "server"
  );

  const clientNatives = nativesFromAllNamespaces.filter(
    native => native?.apiset === "client"
  );

  const sharedNatives = nativesFromAllNamespaces.filter(
    native => native?.apiset === "shared"
  );

  return { serverNatives, clientNatives, sharedNatives };
}

async function main() {
  const writer = new LuaWriter(".luacheckrc");
  const client = new RuntimeNativesClient();
  const excludedScriptFiles = Utils.getExcludedFiles();
  const { RESOURCES_FOLDER_PATH: resourcesPath } = env;

  // TODO: Handle possible exceptions
  const [natives, nativesCfx] = await Promise.all([
    client.fetchNatives(),
    client.fetchNativesCfx()
  ]);

  const { clientNatives, serverNatives, sharedNatives } = mergeAndSortNatives(
    natives,
    nativesCfx
  );

  const clientNativeNames = clientNatives.map(native =>
    LuaUtils.toPascalCase(native.name)
  );

  const serverNativeNames = serverNatives.map(native =>
    LuaUtils.toPascalCase(native.name)
  );

  const sharedNativeNames = sharedNatives.map(native =>
    LuaUtils.toPascalCase(native.name)
  );

  console.log(`Found ${clientNativeNames.length} client natives`);
  console.log(`Found ${serverNativeNames.length} server natives`);
  console.log(`Found ${sharedNativeNames.length} shared natives`);

  writer
    .addVariable("stds.cfx_cl", {
      read_globals: [...clientNativeNames, ...additionalClientFunctions]
    })
    .addVariable("stds.cfx_sv", {
      globals: ["GlobalState"],
      read_globals: [...serverNativeNames, ...additionalServerFunctions]
    })
    .addVariable("stds.cfx", {
      read_globals: sharedNativeNames
    })
    .addVariable("stds.cfx_manifest", {
      read_globals: [...manifestVariables]
    })
    .addVariable('files["**/client.lua"].std', "max+cfx+cfx_cl")
    .addVariable('files["**/cl_*.lua"].std', "max+cfx+cfx_cl")
    .addVariable('files["**/client/**/*.lua"].std', "max+cfx+cfx_cl")
    .addVariable('files["**/server.lua"].std', "max+cfx+cfx_sv")
    .addVariable('files["**/sv_*.lua"].std', "max+cfx+cfx_sv")
    .addVariable('files["**/server/**/*.lua"].std', "max+cfx+cfx_sv")
    .addVariable('files["**/fxmanifest.lua"].std', "max+cfx_manifest")
    .addVariable('files["**/__resource.lua"].std', "max+cfx_manifest")
    .addVariable(
      "exclude_files",
      Object.values(excludedScriptFiles).map(path => path)
    );

  writer.writeToFile();

  const exitCode = await Utils.runCommand(
    "luacheck",
    "--config",
    ".luacheckrc",
    resourcesPath
  );

  process.exit(exitCode);
}

main();
