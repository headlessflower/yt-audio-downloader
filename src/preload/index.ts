import { contextBridge, ipcRenderer } from "electron";

console.log("[preload] loaded OK");

const api = {
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (s: any) => ipcRenderer.invoke("settings:set", s),
    pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  },
  queue: {
    get: () => ipcRenderer.invoke("queue:get"),
    add: (url: string, options: any) =>
      ipcRenderer.invoke("queue:add", url, options),
    cancel: (id: string) => ipcRenderer.invoke("queue:cancel", id),
    remove: (id: string) => ipcRenderer.invoke("queue:remove", id),
    retry: (id: string) => ipcRenderer.invoke("queue:retry", id),
    onUpdated: (cb: (state: any) => void) => {
      const handler = (_: unknown, state: any) => cb(state);
      ipcRenderer.on("queue:updated", handler);
      return () => ipcRenderer.removeListener("queue:updated", handler);
    },
  },
  shell: {
    openPath: (p: string) => ipcRenderer.invoke("shell:openPath", p),
    showItemInFolder: (p: string) =>
      ipcRenderer.invoke("shell:showItemInFolder", p),
  },
} as const;

contextBridge.exposeInMainWorld("api", api);
console.log("[preload] window.api exposed");

declare global {
  interface Window {
    api: typeof api;
  }
}
