import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { DownloadQueue } from "./queue";
import { registerIpc } from "./ipc";
import { store } from "./store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;

// queue emits state updates to renderer
const queue = new DownloadQueue((state) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send("queue:updated", state);
  }
});

function resolvePreload() {
  const preloadDir = path.join(__dirname, "../preload");
  const candidates = ["index.js", "index.mjs", "index.cjs"].map((f) =>
    path.join(preloadDir, f),
  );
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    console.error("[main] preload not found. Tried:", candidates);
    return undefined;
  }
  console.log("[main] preloadPath =", found);
  return found;
}

function createWindow() {
  const preloadPath = resolvePreload();

  const w = new BrowserWindow({
    width: 1100,
    height: 1100,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // Required for ESM preload (.mjs)
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    w.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    w.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return w;
}

app.whenReady().then(() => {
  // Ensure default output dir exists
  const settings = store.get("settings");
  if (!settings.outputDir) {
    store.set("settings", { ...settings, outputDir: app.getPath("music") });
  }

  // Register IPC handlers BEFORE renderer starts invoking them
  registerIpc(queue);

  win = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) win = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
