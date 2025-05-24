export declare class Utils {
    static getExcludedFiles(): Record<string, string>;
    private static ensureDirectoryExists;
    static runCommand(command: string, ...args: Array<string>): Promise<number>;
}
