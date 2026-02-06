export type AudioFormat = "mp3" | "opus" | "flac";

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "canceled"
  | "skipped";

export type DownloadOptions = {
  outputDir: string;
  audioFormat: AudioFormat;
  embedMetadata: boolean;
  embedThumbnail: boolean;
  allowPlaylists: boolean;
};

export type DownloadProgress = {
  percent: number;
  speed?: string;
  eta?: string;
  total?: string;
};

export type DownloadItem = {
  id: string;
  url: string;
  title: string;
  status: DownloadStatus;
  progress: DownloadProgress;
  outputPath: string;
  error: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  options: DownloadOptions;
};

export type QueueState = {
  items: DownloadItem[];
  activeId: string | null;
};

export type Settings = DownloadOptions;
