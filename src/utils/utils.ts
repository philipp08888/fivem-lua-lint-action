import { spawn } from "child_process";
import * as fs from "fs";
import path from "path";
import { env } from "./env";

export class Utils {
  static getExcludedFiles(): Record<string, string> {
    const { RESOURCES_FOLDER_PATH, IGNORED_SCRIPT_LIST } = env;

    const absoluteResourcesPath = path.resolve(RESOURCES_FOLDER_PATH);

    Utils.ensureDirectoryExists(absoluteResourcesPath);

    const scriptFolders: Record<string, string> = {};

    const isCategoryFolder = (name: string) =>
      name.startsWith("[") && name.endsWith("]");

    const shouldIncludeFolder = (folderName: string): boolean =>
      IGNORED_SCRIPT_LIST.includes(folderName);

    const getGlobPattern = (absolutePath: string): string => {
      const relativePath = path.relative(process.cwd(), absolutePath);
      const normalized = relativePath.split(path.sep).join("/"); // POSIX style
      return `${normalized}/**/*.lua`;
    };

    const scanScripts = (dir: string, inCategory: boolean = false): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const entryPath = path.join(dir, entry.name);

        if (isCategoryFolder(entry.name)) {
          scanScripts(entryPath, true);
        } else if (dir === absoluteResourcesPath || inCategory) {
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

  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Path does not exist: '${dirPath}'`);
    }

    if (!fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Path is not a directory: '${dirPath}'`);
    }
  }

  static runCommand(command: string, ...args: Array<string>): Promise<number> {
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
