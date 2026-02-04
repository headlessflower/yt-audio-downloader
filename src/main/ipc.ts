import { ipcMain, dialog, shell } from "electron";
import type { DownloadOptions, Settings } from "@renderer/types";
import { store } from "./store";
import type { DownloadQueue } from "./queue";

export function registerIpc(queue: DownloadQueue) {
  ipcMain.handle("settings:get", () => store.get("settings"));
  ipcMain.handle("settings:set", (_e, settings: Settings) => {
    store.set("settings", settings);
    return settings;
  });

  ipcMain.handle("dialog:pickFolder", async () => {
    const res = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (res.canceled) return "";
    return res.filePaths[0] ?? "";
  });

  ipcMain.handle("queue:get", () => queue.getState());

  ipcMain.handle("queue:add", (_e, url: string, options: DownloadOptions) => {
    return queue.add(url, options);
  });

  ipcMain.handle("queue:cancel", (_e, id: string) => queue.cancel(id));
  ipcMain.handle("queue:remove", (_e, id: string) => queue.remove(id));
  ipcMain.handle("queue:retry", (_e, id: string) => {
    return queue.retry(id, settings);
  });

  ipcMain.handle("shell:openPath", (_e, filePath: string) =>
    shell.openPath(filePath),
  );
  ipcMain.handle("shell:showItemInFolder", (_e, filePath: string) =>
    shell.showItemInFolder(filePath),
  );
}
