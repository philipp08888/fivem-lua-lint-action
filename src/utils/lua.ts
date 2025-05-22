import * as fs from "fs/promises";

type ValueOrArray<T> = T | Array<T>;

export type LuaValue =
  | ValueOrArray<string>
  | ValueOrArray<number>
  | ValueOrArray<boolean>
  | ValueOrArray<LuaTable>
  | null;

export interface LuaTable {
  [key: string]: LuaValue;
}

export interface LuaVariable {
  name: string;
  value: LuaValue;
}

export class LuaUtils {
  static formatVariable(name: string, value: LuaValue): string {
    return `${name} = ${this.formatValue(value)}`;
  }

  static formatValue(value: LuaValue, indent: number = 0): string {
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

  static formatArray(array: Array<LuaValue>, indent: number): string {
    const indentStr = "  ".repeat(indent);
    const entries = array
      .map(item => `${indentStr}  ${this.formatValue(item, indent + 1)}`)
      .join(",\n");
    return `{\n${entries}\n${indentStr}}`;
  }

  static formatTable(table: LuaTable, indent: number): string {
    const indentStr = "  ".repeat(indent);
    const entries = Object.entries(table)
      .map(([key, val]) => {
        const formattedKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
          ? key
          : `["${key}"]`;
        return `${indentStr}  ${formattedKey} = ${this.formatValue(
          val,
          indent + 1
        )}`;
      })
      .join(",\n");
    return `{\n${entries}\n${indentStr}}`;
  }

  static toPascalCase(functionName: string): string {
    if (!functionName || typeof functionName !== "string") {
      throw new Error("Function name must be a non-empty string");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(functionName)) {
      throw new Error(
        `Invalid function name: ${functionName}. Only alphanumeric characters and underscores are allowed.`
      );
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
      throw new Error(
        `Function name '${functionName}' is a reserved Lua keyword`
      );
    }

    const words = functionName.split("_").filter(word => word.length > 0);

    if (words.length === 0) {
      throw new Error(
        `Invalid function name: ${functionName}. No valid words found after splitting.`
      );
    }

    const pascalCaseName = words
      .map(word => {
        if (word.length === 0) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");

    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(pascalCaseName)) {
      throw new Error(
        `Generated PascalCase name '${pascalCaseName}' is not a valid Lua identifier`
      );
    }

    return pascalCaseName;
  }
}

export class LuaWriter {
  private variables: LuaVariable[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  addVariable(name: string, value: LuaValue): this {
    this.variables.push({ name, value });
    return this;
  }

  addVariables(variables: Array<LuaVariable>): this {
    this.variables.push(...variables);
    return this;
  }

  async writeToFile(): Promise<void> {
    try {
      const content = this.variables
        .map(({ name, value }) => LuaUtils.formatVariable(name, value))
        .join("\n\n");
      await fs.writeFile(this.filePath, content, "utf8");
    } catch (error) {
      throw new Error(`Failed to write Lua file: ${error}`);
    }
  }

  clear(): this {
    this.variables = [];
    return this;
  }
}
