declare module 'node-fetch' {
  import { RequestInit, Response } from 'node-fetch';
  function fetch(url: string, init?: RequestInit): Promise<Response>;
  export = fetch;
}
