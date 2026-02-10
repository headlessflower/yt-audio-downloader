import type {
  DownloadItem,
  DownloadOptions,
  QueueState,
  Settings,
} from "../../shared/types";

export {};

declare global {
  interface Window {
    api: {
      settings: {
        get(): Promise<Settings>;
        set(s: Settings): Promise<Settings>;
        pickFolder(): Promise<string>;
      };
      queue: {
        get(): Promise<QueueState>;
        add(
          url: string,
          options: DownloadOptions,
        ): Promise<
          { ok: true; item: DownloadItem } | { ok: false; error: any }
        >;
        cancel(id: string): Promise<void>;
        remove(id: string): Promise<void>;
        retry(id: string): Promise<void>;
        clearFinished(): Promise<void>;
        onUpdated(cb: (state: QueueState) => void): () => void;
      };
      shell: {
        openPath(p: string): Promise<string>;
        showItemInFolder(p: string): Promise<void>;
      };
      ui: {
        showTextContextMenu: () => Promise<void>;
      };
    };
  }
}
