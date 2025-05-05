import { upload } from '@tauri-apps/plugin-upload';
import { isValidArray } from '@/utils';
import { draw } from 'radash';
import { fetch } from '@tauri-apps/plugin-http';

export namespace ITinify {
  export interface ApiCompressResult {
    input: {
      size: number;
      type: string;
    };
    output: {
      width: number;
      height: number;
      ratio: number;
      size: number;
      type: string;
      url: string;
    };
  }
  export interface CompressResult extends ApiCompressResult {
    id: string;
  }
}

export class Tinify {
  private static API_ENDPOINT = 'https://api.tinify.com';

  apiKeys: string[] = [];
  apiKey64s: Map<string, string> = new Map();

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys.filter(Boolean);
    this.apiKey64s = new Map(this.apiKeys.map((apiKey) => [apiKey, btoa(`api:${apiKey}`)]));
  }

  public async compress(filePtah: string, mime: string): Promise<ITinify.CompressResult> {
    return new Promise<ITinify.CompressResult>(async (resolve, reject) => {
      if (!isValidArray(this.apiKeys)) {
        return reject(new TypeError('TinyPNG API Keys is empty'));
      }
      try {
        const apiKey = draw(this.apiKeys);
        const headers = new Map<string, string>();
        headers.set('Content-Type', mime);
        headers.set('Authorization', `Basic ${this.apiKey64s.get(apiKey)}`);
        const result = await upload(`${Tinify.API_ENDPOINT}/shrink`, filePtah, undefined, headers);
        const payload = JSON.parse(result) as ITinify.ApiCompressResult;
        resolve({
          id: filePtah,
          input: payload.input,
          output: payload.output,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async validate(apiKey: string): Promise<{
    ok: boolean;
    compressionCount?: string;
  }> {
    try {
      const url = `${Tinify.API_ENDPOINT}/shrink`;
      const headers = new Headers({
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/json',
      });
      const result = await fetch(url, {
        method: 'POST',
        headers,
      });
      if (result.headers.has('compression-count')) {
        return {
          ok: true,
          compressionCount: result.headers.get('compression-count'),
        };
      }
      return {
        ok: false,
      };
    } catch (error) {
      return {
        ok: false,
      };
    }
  }
}
