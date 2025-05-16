import * as ansi from "ansi-colors";
import "dotenv/config";
import { cleanEnv, makeValidator, str } from "envalid";
import * as fs from "fs";
import fetch from "node-fetch";
import * as os from "os";
import * as path from "path";

interface CfxNative {
  name: string;
  params: {
    name: string;
    type: string;
    description: string;
  }[];
  results: "int" | "void" | "long" | "BOOL" | string;
  description: string;
  examples: {
    lang: "lua" | string;
    code: string;
  }[];
  hash: string;
  ns: string;
  aliases?: string[];
  apiset: "client" | "server" | "shared";
  game: "gta5" | "rdr3" | "ny";
}

type CfxNativesResponse = {
  [group: string]: { [native: string]: CfxNative };
};

const list = makeValidator(x => {
  if (typeof x !== "string") {
    throw new Error(`Expected a comma-separated string, got ${typeof x}`);
  }

  const values = x
    .split(",")
    .map(value => value.trim())
    .filter(value => value.length > 0);

  return values;
});

const env = cleanEnv(process.env, {
  IGNORED_SCRIPTS: list(),
  RESOURCES_PATH: str()
});

/**
 * Scans the resources folder for script folders, returning their names and full paths.
 * @param resourcesPath The path of your resources folder
 * @throws {Error} If the resources path does not exist or is not a directory.
 * @returns A record where keys are script folder names and values are their full paths.
 */
const getScriptFolders = (resourcesPath: string): Record<string, string> => {
  const resolvedPath = resourcesPath.startsWith("~")
    ? path.join(os.homedir(), resourcesPath.slice(1))
    : resourcesPath;

  const absolutePath = path.resolve(resolvedPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }
  if (!fs.statSync(absolutePath).isDirectory()) {
    throw new Error(`Path is not a directory: ${absolutePath}`);
  }

  const scriptFolders: Record<string, string> = {};

  const scanDirectory = (
    currentPath: string,
    isCategoryFolder: boolean = false
  ) => {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const isCategory =
          entry.name.startsWith("[") && entry.name.endsWith("]");

        if (isCategory) {
          scanDirectory(fullPath, true);
        } else if (currentPath === absolutePath || isCategoryFolder) {
          scriptFolders[entry.name] = fullPath;
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error);
    }
  };

  scanDirectory(absolutePath);
  return scriptFolders;
};

const macroCaseToSnake = (s: string): string => {
  return s
    .split("_")
    .map(str =>
      str
        .split("")
        .map((c, i) => {
          if (+c > 0) return `_${c}`;
          return i === 0 ? c.toUpperCase() : c.toLowerCase();
        })
        .join("")
    )
    .join("");
};

const uniqueArray = <T>(a: T[]): T[] => {
  const b: T[] = [];
  a.forEach(item => {
    if (b.includes(item)) return;
    b.push(item);
  });
  return b;
};

const reduceNativesToNames = (results: string[], item: CfxNative): string[] => {
  let name = item.name || `N_${item.hash}`;
  name = macroCaseToSnake(name);
  results.push(name);
  (item.aliases || []).forEach(a => {
    if (a.slice(0, 1) === "_") {
      let aliasName = macroCaseToSnake(a.slice(1));
      if (aliasName === "GetGroundZFor3dCoord") {
        aliasName = "GetGroundZFor_3dCoord";
      }
      results.push(aliasName);
    }
  });
  return results;
};

interface MappedNativeResponse {
  shared: string[];
  client: string[];
  server: string[];
}

async function fetchAllNatives(): Promise<MappedNativeResponse> {
  const clientNatives: string[] = [];
  const serverNatives: string[] = [];
  const sharedNatives: string[] = [];
  const urls = [
    "https://runtime.fivem.net/doc/natives_cfx.json",
    "https://runtime.fivem.net/doc/natives.json"
  ];

  for (const url of urls) {
    console.log(ansi.cyan(`fetch => ${ansi.blueBright(url)}...`));
    await fetch(url)
      .then<CfxNativesResponse>(r => r.json())
      .then(data => {
        const nativesList: CfxNative[] = Object.entries(data)
          .reduce((natives: CfxNative[], [_, list]) => {
            natives.push(...Object.values(list));
            return natives;
          }, [])
          .filter(n => !!n.name);

        clientNatives.push(
          ...nativesList
            .filter(n => !n.apiset || n.apiset === "client")
            .reduce(reduceNativesToNames, [])
        );
        serverNatives.push(
          ...nativesList
            .filter(n => n.apiset === "server")
            .reduce(reduceNativesToNames, [])
        );
        sharedNatives.push(
          ...nativesList
            .filter(n => n.apiset === "shared")
            .reduce(reduceNativesToNames, [])
        );
      });
  }

  return {
    shared: uniqueArray(sharedNatives),
    client: uniqueArray(clientNatives),
    server: uniqueArray(serverNatives)
  };
}

fetchAllNatives().then(natives => {
  console.log("test ^122");
  let template = fs.readFileSync(
    path.join(__dirname, ".luacheckrc.template"),
    "utf-8"
  );

  template = template
    .replace("%%SHARED_GLOBALS%%", natives.shared.map(s => `'${s}'`).join(", "))
    .replace("%%SERVER_GLOBALS%%", natives.server.map(s => `'${s}'`).join(", "))
    .replace(
      "%%CLIENT_GLOBALS%%",
      natives.client.map(s => `'${s}'`).join(", ")
    );

  let extraLibs = "";
  const extraLibUserArg = process.argv[3];
  if (extraLibUserArg?.length) {
    extraLibs = `+${extraLibUserArg}`;
  }

  if (extraLibs.length) {
    console.log(
      ansi.gray(
        `${ansi.yellow(`extra`)} ${ansi.cyan(`=>`)} ${ansi.magentaBright(
          extraLibs
        )}`
      )
    );
  }

  if (env.RESOURCES_PATH && env.IGNORED_SCRIPTS.length > 0) {
    try {
      const scripts = getScriptFolders(env.RESOURCES_PATH);
      const excludedScriptKeys = Object.keys(scripts).filter(key =>
        env.IGNORED_SCRIPTS.some(v => v.toLowerCase() === key.toLowerCase())
      );

      if (excludedScriptKeys.length === 0) {
        //return;
      }

      const excludedFiles: Array<string> = [];

      for (const excludedScriptKey of excludedScriptKeys) {
        const excludedScript = scripts[excludedScriptKey];

        if (excludedScript === undefined) {
          continue;
        }

        excludedFiles.push(`"${excludedScript}/**/*.lua"`);
        console.log(
          ansi.red(`ignore => ${ansi.blueBright(excludedScriptKey)}`)
        );
      }

      template += `excluded_files = { ${excludedFiles.join(", ")} }`;
    } catch (error) {
      console.log(
        `Error while loading all scripts from resources path '${env.RESOURCES_PATH}': ${error}`
      );
    }
  }

  template = template.replace(/%%EXTRA%%/g, extraLibs);

  const c = `${__dirname}/.luacheckrc`;
  console.log({ c });

  fs.writeFileSync(path.join(__dirname, ".luacheckrc"), template);
  console.log(ansi.gray(`=`.repeat(29)));
  console.log(
    ansi.gray(
      `=== ${ansi.yellow(
        natives.shared.length.toString()
      )} ${ansi.magentaBright("shared")} generated`.padEnd(45, " ") + " ==="
    )
  );
  console.log(
    ansi.gray(
      `=== ${ansi.blue(natives.server.length.toString())} ${ansi.magentaBright(
        "server"
      )} generated`.padEnd(45, " ") + " ==="
    )
  );
  console.log(
    ansi.gray(
      `=== ${ansi.green(natives.client.length.toString())} ${ansi.magentaBright(
        "client"
      )} generated`.padEnd(45, " ") + " ==="
    )
  );

  console.log(
    ansi.gray(`========[ ${ansi.greenBright("COMPLETED")} ]========`)
  );
});
