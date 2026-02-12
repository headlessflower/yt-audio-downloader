import { app, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";

export type Settings = {
    outputDir: string;
    audioFormat: "mp3" | "opus" | "flac";
    embedMetadata: boolean;
    embedThumbnail: boolean;
    allowPlaylists: boolean;
};

const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");

const DEFAULT_SETTINGS: Settings = {
    outputDir: app.getPath("music"),
    audioFormat: "mp3",
    embedMetadata: true,
    embedThumbnail: true,
    allowPlaylists: false,
};

let settings: Settings = loadSettings();

function loadSettings(): Settings {
    try {
        const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveSettings(next: Settings) {
    settings = { ...DEFAULT_SETTINGS, ...next };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
    return settings;
}

export function registerSettingsIpc() {
    ipcMain.handle("settings:get", () => settings);
    ipcMain.handle("settings:set", (_e, next: Settings) => saveSettings(next));
}
