type ValueOrArray<T> = T | Array<T>;
export type LuaValue = ValueOrArray<string> | ValueOrArray<number> | ValueOrArray<boolean> | ValueOrArray<LuaTable> | null;
export interface LuaTable {
    [key: string]: LuaValue;
}
export interface LuaVariable {
    name: string;
    value: LuaValue;
}
export declare class LuaUtils {
    static formatVariable(name: string, value: LuaValue): string;
    static formatValue(value: LuaValue, indent?: number): string;
    static formatArray(array: Array<LuaValue>, indent: number): string;
    static formatTable(table: LuaTable, indent: number): string;
    static toPascalCase(functionName: string): string;
}
export declare class LuaWriter {
    private variables;
    private filePath;
    constructor(filePath: string);
    addVariable(name: string, value: LuaValue): this;
    addVariables(variables: Array<LuaVariable>): this;
    writeToFile(): Promise<void>;
    clear(): this;
}
export {};
