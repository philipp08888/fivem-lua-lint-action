import resolve from "@rollup/plugin-node-resolve";
import { builtinModules } from "module";
import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

export default defineConfig({
  input: "src/linter.ts",
  output: [
    {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true
    }
  ],
  plugins: [
    resolve({ preferBuiltins: true }),
    typescript({
      tsconfig: "tsconfig.json",
      clean: true,
      useTsconfigDeclarationDir: true
    })
  ],
  external: [
    ...builtinModules,
    "axios",
    "dotenv",
    "envalid",
    "node-fetch",
    "ansi-colors"
  ]
});
