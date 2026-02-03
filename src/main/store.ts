import Store from "electron-store";
import type { DownloadItem, Settings } from "@renderer/types";

type Schema = {
  settings: Settings;
  history: DownloadItem[];
};

export const store = new Store<Schema>({
  name: "config",
  defaults: {
    settings: {
      outputDir: "",
      audioFormat: "mp3",
      embedMetadata: true,
      embedThumbnail: true,
      allowPlaylists: false,
    },
    history: [],
  },
});
