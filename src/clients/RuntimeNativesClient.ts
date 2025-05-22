import axios, { AxiosInstance, AxiosResponse } from "axios";

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

export class RuntimeNativesClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://runtime.fivem.net/doc",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async fetchNatives(): Promise<NativeResponse> {
    try {
      const response: AxiosResponse<NativeResponse> = await this.client.get(
        "/natives.json"
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch natives: ${error}`);
    }
  }

  async fetchNativesCfx(): Promise<NativeResponse> {
    try {
      const response: AxiosResponse<NativeResponse> = await this.client.get(
        "/natives_cfx.json"
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch CFX natives: ${error}`);
    }
  }
}
