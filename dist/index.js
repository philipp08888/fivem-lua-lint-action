import axios from 'axios';
import { makeValidator, cleanEnv, str } from 'envalid';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as fs$1 from 'fs';
import fs__default from 'fs';
import path from 'path';
import require$$2 from 'os';
import require$$3 from 'crypto';

class RuntimeNativesClient {
    constructor() {
        this.client = axios.create({
            baseURL: "https://runtime.fivem.net/doc",
            timeout: 10000,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    async fetchNatives() {
        try {
            const response = await this.client.get("/natives.json");
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch natives: ${error}`);
        }
    }
    async fetchNativesCfx() {
        try {
            const response = await this.client.get("/natives_cfx.json");
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch CFX natives: ${error}`);
        }
    }
}

/* This file contains any additional function names, feel free to extend it! */
const esxServerFunctions = ["ESX.GetPlayers"];
const cfxServerFunctions = [
    "source",
    "TriggerClientEvent",
    "TriggerLatentClientEvent",
    "RegisterServerEvent",
    "GetPlayerIdentifiers",
    "GetPlayers",
    "PerformHttpRequest"
];
const cfxClientFunctions = [
    "TriggerServerEvent",
    "RegisterNUICallback",
    "SendNUIMessage",
    "GlobalState"
];
const sharedFunctions = [
    "CreateThread",
    "Citizen",
    "SetTimeout",
    "Await",
    "Wait",
    "Trace",
    "AddEventHandler",
    "RegisterNetEvent",
    "TriggerEvent",
    "RemoveEventHandler",
    "exports",
    "json",
    "quat",
    "vec",
    "vector2",
    "vec2",
    "vector3",
    "vec3",
    "vector4",
    "vec4"
];
const manifestVariables = [
    "fx_version",
    "games",
    "game",
    "author",
    "description",
    "version",
    "client_scripts",
    "client_script",
    "server_scripts",
    "server_script",
    "shared_scripts",
    "shared_script",
    "export",
    "exports",
    "replace_level_meta",
    "data_file",
    "this_is_a_map",
    "server_only",
    "loadscreen",
    "ui_page",
    "file",
    "files",
    "my_data",
    "dependency",
    "dependencies",
    "provide",
    "lua54",
    "disable_lazy_natives",
    "clr_disable_task_scheduler"
];
const additionalServerFunctions = [
    ...esxServerFunctions,
    ...cfxServerFunctions,
    ...sharedFunctions
];
const additionalClientFunctions = [
    ...cfxClientFunctions,
    ...sharedFunctions
];

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
    IGNORED_SCRIPT_LIST: list(),
    RESOURCES_FOLDER_PATH: str()
});

class LuaUtils {
    static formatVariable(name, value) {
        return `${name} = ${this.formatValue(value)}`;
    }
    static formatValue(value, indent = 0) {
        if (value === null) {
            return "nil";
        }
        if (typeof value === "string") {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        if (typeof value === "number" || typeof value === "boolean") {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return this.formatArray(value, indent);
        }
        if (typeof value === "object") {
            return this.formatTable(value, indent);
        }
        throw new Error(`Unsupported Lua value type: ${typeof value}`);
    }
    static formatArray(array, indent) {
        const indentStr = "  ".repeat(indent);
        const entries = array
            .map(item => `${indentStr}  ${this.formatValue(item, indent + 1)}`)
            .join(",\n");
        return `{\n${entries}\n${indentStr}}`;
    }
    static formatTable(table, indent) {
        const indentStr = "  ".repeat(indent);
        const entries = Object.entries(table)
            .map(([key, val]) => {
            const formattedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
                ? key
                : `["${key}"]`;
            return `${indentStr}  ${formattedKey} = ${this.formatValue(val, indent + 1)}`;
        })
            .join(",\n");
        return `{\n${entries}\n${indentStr}}`;
    }
    static toPascalCase(functionName) {
        if (!functionName || typeof functionName !== "string") {
            throw new Error("Function name must be a non-empty string");
        }
        if (!/^[a-zA-Z0-9_]+$/.test(functionName)) {
            throw new Error(`Invalid function name: ${functionName}. Only alphanumeric characters and underscores are allowed.`);
        }
        const reservedKeywords = [
            "and",
            "break",
            "do",
            "else",
            "elseif",
            "end",
            "false",
            "for",
            "function",
            "if",
            "in",
            "local",
            "nil",
            "not",
            "or",
            "repeat",
            "return",
            "then",
            "true",
            "until",
            "while"
        ];
        const lowerFunctionName = functionName.toLowerCase();
        if (reservedKeywords.includes(lowerFunctionName)) {
            throw new Error(`Function name '${functionName}' is a reserved Lua keyword`);
        }
        const words = functionName.split("_").filter(word => word.length > 0);
        if (words.length === 0) {
            throw new Error(`Invalid function name: ${functionName}. No valid words found after splitting.`);
        }
        const pascalCaseName = words
            .map(word => {
            if (word.length === 0)
                return "";
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
            .join("");
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(pascalCaseName)) {
            throw new Error(`Generated PascalCase name '${pascalCaseName}' is not a valid Lua identifier`);
        }
        return pascalCaseName;
    }
}
class LuaWriter {
    constructor(filePath) {
        this.variables = [];
        this.filePath = filePath;
    }
    addVariable(name, value) {
        this.variables.push({ name, value });
        return this;
    }
    addVariables(variables) {
        this.variables.push(...variables);
        return this;
    }
    async writeToFile() {
        try {
            const content = this.variables
                .map(({ name, value }) => LuaUtils.formatVariable(name, value))
                .join("\n\n");
            await fs.writeFile(this.filePath, content, "utf8");
        }
        catch (error) {
            throw new Error(`Failed to write Lua file: ${error}`);
        }
    }
    clear() {
        this.variables = [];
        return this;
    }
}

class Utils {
    static getExcludedFiles() {
        const { RESOURCES_FOLDER_PATH, IGNORED_SCRIPT_LIST } = env;
        const absoluteResourcesPath = path.resolve(RESOURCES_FOLDER_PATH);
        Utils.ensureDirectoryExists(absoluteResourcesPath);
        const scriptFolders = {};
        const isCategoryFolder = (name) => name.startsWith("[") && name.endsWith("]");
        const shouldIncludeFolder = (folderName) => IGNORED_SCRIPT_LIST.includes(folderName);
        const getGlobPattern = (absolutePath) => {
            const relativePath = path.relative(process.cwd(), absolutePath);
            const normalized = relativePath.split(path.sep).join("/"); // POSIX style
            return `${normalized}/**/*.lua`;
        };
        const scanScripts = (dir, inCategory = false) => {
            const entries = fs$1.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const entryPath = path.join(dir, entry.name);
                if (isCategoryFolder(entry.name)) {
                    scanScripts(entryPath, true);
                }
                else if (dir === absoluteResourcesPath || inCategory) {
                    if (shouldIncludeFolder(entry.name)) {
                        const luaGlob = getGlobPattern(entryPath);
                        scriptFolders[entry.name] = luaGlob;
                        console.log(`Ignore '${entry.name}' script: ${luaGlob}`);
                    }
                }
            }
        };
        scanScripts(absoluteResourcesPath);
        return scriptFolders;
    }
    static ensureDirectoryExists(dirPath) {
        if (!fs$1.existsSync(dirPath)) {
            throw new Error(`Path does not exist: '${dirPath}'`);
        }
        if (!fs$1.statSync(dirPath).isDirectory()) {
            throw new Error(`Path is not a directory: '${dirPath}'`);
        }
    }
    static runCommand(command, ...args) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, { stdio: "inherit" });
            child.on("close", code => {
                resolve(code ?? 1);
            });
            child.on("error", err => {
                console.error(`Failed to start subprocess: ${err}`);
                reject(err);
            });
        });
    }
}

var config = {};

var main$1 = {exports: {}};

var version = "16.5.0";
var require$$4 = {
	version: version};

var hasRequiredMain;

function requireMain () {
	if (hasRequiredMain) return main$1.exports;
	hasRequiredMain = 1;
	const fs = fs__default;
	const path$1 = path;
	const os = require$$2;
	const crypto = require$$3;
	const packageJson = require$$4;

	const version = packageJson.version;

	const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;

	// Parse src into an Object
	function parse (src) {
	  const obj = {};

	  // Convert buffer to string
	  let lines = src.toString();

	  // Convert line breaks to same format
	  lines = lines.replace(/\r\n?/mg, '\n');

	  let match;
	  while ((match = LINE.exec(lines)) != null) {
	    const key = match[1];

	    // Default undefined or null to empty string
	    let value = (match[2] || '');

	    // Remove whitespace
	    value = value.trim();

	    // Check if double quoted
	    const maybeQuote = value[0];

	    // Remove surrounding quotes
	    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');

	    // Expand newlines if double quoted
	    if (maybeQuote === '"') {
	      value = value.replace(/\\n/g, '\n');
	      value = value.replace(/\\r/g, '\r');
	    }

	    // Add to object
	    obj[key] = value;
	  }

	  return obj
	}

	function _parseVault (options) {
	  const vaultPath = _vaultPath(options);

	  // Parse .env.vault
	  const result = DotenvModule.configDotenv({ path: vaultPath });
	  if (!result.parsed) {
	    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
	    err.code = 'MISSING_DATA';
	    throw err
	  }

	  // handle scenario for comma separated keys - for use with key rotation
	  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
	  const keys = _dotenvKey(options).split(',');
	  const length = keys.length;

	  let decrypted;
	  for (let i = 0; i < length; i++) {
	    try {
	      // Get full key
	      const key = keys[i].trim();

	      // Get instructions for decrypt
	      const attrs = _instructions(result, key);

	      // Decrypt
	      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);

	      break
	    } catch (error) {
	      // last key
	      if (i + 1 >= length) {
	        throw error
	      }
	      // try next key
	    }
	  }

	  // Parse decrypted .env string
	  return DotenvModule.parse(decrypted)
	}

	function _warn (message) {
	  console.log(`[dotenv@${version}][WARN] ${message}`);
	}

	function _debug (message) {
	  console.log(`[dotenv@${version}][DEBUG] ${message}`);
	}

	function _dotenvKey (options) {
	  // prioritize developer directly setting options.DOTENV_KEY
	  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
	    return options.DOTENV_KEY
	  }

	  // secondary infra already contains a DOTENV_KEY environment variable
	  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
	    return process.env.DOTENV_KEY
	  }

	  // fallback to empty string
	  return ''
	}

	function _instructions (result, dotenvKey) {
	  // Parse DOTENV_KEY. Format is a URI
	  let uri;
	  try {
	    uri = new URL(dotenvKey);
	  } catch (error) {
	    if (error.code === 'ERR_INVALID_URL') {
	      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    }

	    throw error
	  }

	  // Get decrypt key
	  const key = uri.password;
	  if (!key) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing key part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get environment
	  const environment = uri.searchParams.get('environment');
	  if (!environment) {
	    const err = new Error('INVALID_DOTENV_KEY: Missing environment part');
	    err.code = 'INVALID_DOTENV_KEY';
	    throw err
	  }

	  // Get ciphertext payload
	  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
	  const ciphertext = result.parsed[environmentKey]; // DOTENV_VAULT_PRODUCTION
	  if (!ciphertext) {
	    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
	    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT';
	    throw err
	  }

	  return { ciphertext, key }
	}

	function _vaultPath (options) {
	  let possibleVaultPath = null;

	  if (options && options.path && options.path.length > 0) {
	    if (Array.isArray(options.path)) {
	      for (const filepath of options.path) {
	        if (fs.existsSync(filepath)) {
	          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`;
	        }
	      }
	    } else {
	      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`;
	    }
	  } else {
	    possibleVaultPath = path$1.resolve(process.cwd(), '.env.vault');
	  }

	  if (fs.existsSync(possibleVaultPath)) {
	    return possibleVaultPath
	  }

	  return null
	}

	function _resolveHome (envPath) {
	  return envPath[0] === '~' ? path$1.join(os.homedir(), envPath.slice(1)) : envPath
	}

	function _configVault (options) {
	  const debug = Boolean(options && options.debug);
	  if (debug) {
	    _debug('Loading env from encrypted .env.vault');
	  }

	  const parsed = DotenvModule._parseVault(options);

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsed, options);

	  return { parsed }
	}

	function configDotenv (options) {
	  const dotenvPath = path$1.resolve(process.cwd(), '.env');
	  let encoding = 'utf8';
	  const debug = Boolean(options && options.debug);

	  if (options && options.encoding) {
	    encoding = options.encoding;
	  } else {
	    if (debug) {
	      _debug('No encoding is specified. UTF-8 is used by default');
	    }
	  }

	  let optionPaths = [dotenvPath]; // default, look for .env
	  if (options && options.path) {
	    if (!Array.isArray(options.path)) {
	      optionPaths = [_resolveHome(options.path)];
	    } else {
	      optionPaths = []; // reset default
	      for (const filepath of options.path) {
	        optionPaths.push(_resolveHome(filepath));
	      }
	    }
	  }

	  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
	  // parsed data, we will combine it with process.env (or options.processEnv if provided).
	  let lastError;
	  const parsedAll = {};
	  for (const path of optionPaths) {
	    try {
	      // Specifying an encoding returns a string instead of a buffer
	      const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }));

	      DotenvModule.populate(parsedAll, parsed, options);
	    } catch (e) {
	      if (debug) {
	        _debug(`Failed to load ${path} ${e.message}`);
	      }
	      lastError = e;
	    }
	  }

	  let processEnv = process.env;
	  if (options && options.processEnv != null) {
	    processEnv = options.processEnv;
	  }

	  DotenvModule.populate(processEnv, parsedAll, options);

	  if (lastError) {
	    return { parsed: parsedAll, error: lastError }
	  } else {
	    return { parsed: parsedAll }
	  }
	}

	// Populates process.env from .env file
	function config (options) {
	  // fallback to original dotenv if DOTENV_KEY is not set
	  if (_dotenvKey(options).length === 0) {
	    return DotenvModule.configDotenv(options)
	  }

	  const vaultPath = _vaultPath(options);

	  // dotenvKey exists but .env.vault file does not exist
	  if (!vaultPath) {
	    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);

	    return DotenvModule.configDotenv(options)
	  }

	  return DotenvModule._configVault(options)
	}

	function decrypt (encrypted, keyStr) {
	  const key = Buffer.from(keyStr.slice(-64), 'hex');
	  let ciphertext = Buffer.from(encrypted, 'base64');

	  const nonce = ciphertext.subarray(0, 12);
	  const authTag = ciphertext.subarray(-16);
	  ciphertext = ciphertext.subarray(12, -16);

	  try {
	    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce);
	    aesgcm.setAuthTag(authTag);
	    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
	  } catch (error) {
	    const isRange = error instanceof RangeError;
	    const invalidKeyLength = error.message === 'Invalid key length';
	    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data';

	    if (isRange || invalidKeyLength) {
	      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)');
	      err.code = 'INVALID_DOTENV_KEY';
	      throw err
	    } else if (decryptionFailed) {
	      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY');
	      err.code = 'DECRYPTION_FAILED';
	      throw err
	    } else {
	      throw error
	    }
	  }
	}

	// Populate process.env with parsed values
	function populate (processEnv, parsed, options = {}) {
	  const debug = Boolean(options && options.debug);
	  const override = Boolean(options && options.override);

	  if (typeof parsed !== 'object') {
	    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate');
	    err.code = 'OBJECT_REQUIRED';
	    throw err
	  }

	  // Set process.env
	  for (const key of Object.keys(parsed)) {
	    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
	      if (override === true) {
	        processEnv[key] = parsed[key];
	      }

	      if (debug) {
	        if (override === true) {
	          _debug(`"${key}" is already defined and WAS overwritten`);
	        } else {
	          _debug(`"${key}" is already defined and was NOT overwritten`);
	        }
	      }
	    } else {
	      processEnv[key] = parsed[key];
	    }
	  }
	}

	const DotenvModule = {
	  configDotenv,
	  _configVault,
	  _parseVault,
	  config,
	  decrypt,
	  parse,
	  populate
	};

	main$1.exports.configDotenv = DotenvModule.configDotenv;
	main$1.exports._configVault = DotenvModule._configVault;
	main$1.exports._parseVault = DotenvModule._parseVault;
	main$1.exports.config = DotenvModule.config;
	main$1.exports.decrypt = DotenvModule.decrypt;
	main$1.exports.parse = DotenvModule.parse;
	main$1.exports.populate = DotenvModule.populate;

	main$1.exports = DotenvModule;
	return main$1.exports;
}

var envOptions;
var hasRequiredEnvOptions;

function requireEnvOptions () {
	if (hasRequiredEnvOptions) return envOptions;
	hasRequiredEnvOptions = 1;
	// ../config.js accepts options via environment variables
	const options = {};

	if (process.env.DOTENV_CONFIG_ENCODING != null) {
	  options.encoding = process.env.DOTENV_CONFIG_ENCODING;
	}

	if (process.env.DOTENV_CONFIG_PATH != null) {
	  options.path = process.env.DOTENV_CONFIG_PATH;
	}

	if (process.env.DOTENV_CONFIG_DEBUG != null) {
	  options.debug = process.env.DOTENV_CONFIG_DEBUG;
	}

	if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
	  options.override = process.env.DOTENV_CONFIG_OVERRIDE;
	}

	if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
	  options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
	}

	envOptions = options;
	return envOptions;
}

var cliOptions;
var hasRequiredCliOptions;

function requireCliOptions () {
	if (hasRequiredCliOptions) return cliOptions;
	hasRequiredCliOptions = 1;
	const re = /^dotenv_config_(encoding|path|debug|override|DOTENV_KEY)=(.+)$/;

	cliOptions = function optionMatcher (args) {
	  return args.reduce(function (acc, cur) {
	    const matches = cur.match(re);
	    if (matches) {
	      acc[matches[1]] = matches[2];
	    }
	    return acc
	  }, {})
	};
	return cliOptions;
}

var hasRequiredConfig;

function requireConfig () {
	if (hasRequiredConfig) return config;
	hasRequiredConfig = 1;
	(function () {
	  requireMain().config(
	    Object.assign(
	      {},
	      requireEnvOptions(),
	      requireCliOptions()(process.argv)
	    )
	  );
	})();
	return config;
}

requireConfig();

function mergeAndSortNatives(natives, nativesCfx) {
    const mergedNatives = { ...natives, ...nativesCfx };
    const namespaces = Object.values(mergedNatives);
    const nativesFromAllNamespaces = namespaces
        .flatMap(hash => Object.values(hash).filter(native => native !== null))
        .filter(n => !!n?.name);
    const serverNatives = nativesFromAllNamespaces.filter(native => native?.apiset === "server");
    const clientNatives = nativesFromAllNamespaces.filter(native => native?.apiset === "client");
    const sharedNatives = nativesFromAllNamespaces.filter(native => native?.apiset === "shared");
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
    const { clientNatives, serverNatives, sharedNatives } = mergeAndSortNatives(natives, nativesCfx);
    const clientNativeNames = clientNatives.map(native => LuaUtils.toPascalCase(native.name));
    const serverNativeNames = serverNatives.map(native => LuaUtils.toPascalCase(native.name));
    const sharedNativeNames = sharedNatives.map(native => LuaUtils.toPascalCase(native.name));
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
        .addVariable("exclude_files", Object.values(excludedScriptFiles).map(path => path));
    writer.writeToFile();
    const exitCode = await Utils.runCommand("luacheck", "--config", ".luacheckrc", resourcesPath);
    process.exit(exitCode);
}
main();
//# sourceMappingURL=index.js.map
