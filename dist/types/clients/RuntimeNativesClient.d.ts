export interface Native {
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
export type NativeResponse = {
    [namespace: string]: {
        [hash: string]: Native;
    };
};
export declare class RuntimeNativesClient {
    private readonly client;
    constructor();
    fetchNatives(): Promise<NativeResponse>;
    fetchNativesCfx(): Promise<NativeResponse>;
}
