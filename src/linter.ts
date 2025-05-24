import { NativeResponse, RuntimeNativesClient } from "./clients";
import {
  additionalClientFunctions,
  additionalServerFunctions,
  LuaUtils,
  LuaWriter
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
    .addVariable("stds.client_natives", {
      read_globals: [...clientNativeNames, ...additionalClientFunctions]
    })
    .addVariable("stds.server_natives", {
      read_globals: [...serverNativeNames, ...additionalServerFunctions]
    })
    .addVariable("stds.shared_natives", {
      read_globals: sharedNativeNames
    });

  writer.writeToFile();
}

main();
