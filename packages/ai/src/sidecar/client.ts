import { SidecarIpcClient } from "./ipc";

let client: SidecarIpcClient | undefined;

export function getSidecarIpcClient() {
  client ??= new SidecarIpcClient({
    input: process.stdin,
    output: process.stdout,
  });

  return client;
}
