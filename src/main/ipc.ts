import { ipcMain, dialog, shell } from "electron";
import type { DownloadOptions, Settings } from "@renderer/types";
import { store } from "./store";
import type { DownloadQueue } from "./queue";
import { Menu } from "electron";

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

  ipcMain.handle(
      "queue:add",
      async (_e, url: string, options: DownloadOptions) => {
        try {
          const item = await queue.add(url, options);
          return { ok: true as const, item };
        } catch (err: any) {
          return { ok: false as const, error: err };
        }
      },
  );

  ipcMain.handle("queue:cancel", (_e, id: string) => queue.cancel(id));
  ipcMain.handle("queue:remove", (_e, id: string) => queue.remove(id));
  ipcMain.handle("queue:retry", (_e, id: string) => {
    return queue.retry(id);
  });

  ipcMain.handle("shell:openPath", (_e, filePath: string) =>
      shell.openPath(filePath),
  );
  ipcMain.handle("shell:showItemInFolder", (_e, filePath: string) =>
      shell.showItemInFolder(filePath),
  );
  ipcMain.handle("ui:showTextContextMenu", (event) => {
    const menu = Menu.buildFromTemplate([
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { type: "separator" },
      { role: "selectAll" },
    ]);

    const win = event.sender.getOwnerBrowserWindow();
    if (win) menu.popup({ window: win });
  });
  ipcMain.handle("queue:clearFinished", () => {
    queue.clearFinished();
  });
}