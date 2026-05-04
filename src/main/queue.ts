
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ytDlpPath, ffmpegPath } from "./ytPaths";
import type {
  DownloadItem,
  DownloadOptions,
  ConversionStage,
  QueueState,
} from "@renderer/types";

import { makeQueueLimitError } from "./errors";

import { QUEUE_LIMITS, type PlanTier } from "./queueLimits";
import { store } from "./store";

const LOCATION_ERRORS = [
  "not available in your country",
  "not available in your region",
  "video unavailable",
  "this video is unavailable",
  "has not made this video available",
  "the uploader has not made this video available",
  "geo-restricted",
  "sign in to confirm your age",
  "age-restricted",
];

type UpdateFn = (state: QueueState) => void;

export class DownloadQueue {
  private items: DownloadItem[] = [];
  private activeId: string | null = null;
  private proc: ReturnType<typeof spawn> | null = null;
  private notify: UpdateFn;

  // plan tier (default free)
  private plan: PlanTier;

  constructor(notify: UpdateFn, plan: PlanTier = "pro") {
    this.notify = notify;
    this.plan = plan;
  }

  //  update plan at runtime (after license check, login, etc.)
  setPlan(plan: PlanTier) {
    this.plan = plan;
    this.pushState();
  }

  getState(): QueueState {
    return { items: this.items, activeId: this.activeId };
  }

  private pushState() {
    this.notify(this.getState());
  }

  // NEW: what counts toward the queue limit
  private queuedCount(): number {
    return this.items.filter(
        (i) =>
            i.status === "pending" ||
            i.status === "downloading" ||
            i.status === "converting",
    ).length;
  }

  private queueLimit(): number {
    return QUEUE_LIMITS[this.plan];
  }

  private assertCanAdd() {
    const limit = this.queueLimit();
    const current = this.queuedCount();

    if (Number.isFinite(limit) && current >= limit) {
      // throw a plain object so it survives IPC cleanly
      throw makeQueueLimitError(limit, current);
    }
  }

  async add(url: string, options: DownloadOptions): Promise<DownloadItem> {
    // NEW: enforce limit BEFORE adding
    this.assertCanAdd();

    const item: DownloadItem = {
      id: randomUUID(),
      url,
      title: "",
      status: "pending",
      progress: { percent: 0 },
      conversionProgress: { completedStages: [] },
      outputPath: options.outputDir,
      error: "",
      createdAt: new Date().toISOString(),
      startedAt: "",
      finishedAt: "",
      options,
    };

    this.items.push(item);
    this.pushState();

    if (!this.activeId) this.startNext();
    return item;
  }

  cancel(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    // Mark canceled so the close handler doesn't mark it failed
    item.status = "canceled";
    item.finishedAt = new Date().toISOString();
    this.pushState();

    if (this.activeId === id) {
      this.proc?.kill("SIGTERM");
    }
  }

  retry(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    // NEW: enforce limit when retrying too (since it re-enters the queue)
    const isCurrentlyQueued =
        item.status === "pending" ||
        item.status === "downloading" ||
        item.status === "converting";

    if (!isCurrentlyQueued) {
      this.assertCanAdd();
    }

    item.status = "pending";
    item.error = "";
    item.startedAt = "";
    item.finishedAt = "";
    item.progress = { percent: 0 };
    item.conversionProgress = { completedStages: [] };
    this.pushState();

    if (!this.activeId) this.startNext();
  }

  remove(id: string) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const item = this.items[idx];

    // If removing the active download, cancel the process first.
    if (this.activeId === id) {
      item.status = "canceled";
      item.finishedAt = new Date().toISOString();
      this.pushState();

      this.proc?.kill("SIGTERM");

      // Remove immediately from list (UI feels snappy)
      this.items.splice(idx, 1);
      this.pushState();
      return;
    }

    // Otherwise just remove it
    this.items.splice(idx, 1);
    this.pushState();
  }

  private startNext() {
    const item = this.items.find((i) => i.status === "pending");
    if (!item) return;

    this.activeId = item.id;
    item.status = "downloading";
    item.startedAt = new Date().toISOString();
    item.progress = { percent: 0 };
    item.conversionProgress = { completedStages: [] };
    this.pushState();

    const args: string[] = [
      urlNormalize(item.url),
      "-x",
      "--audio-format",
      item.options.audioFormat,
      "--audio-quality",
      "0",
      "--ffmpeg-location",
      ffmpegPath(),
      "-o",
      "%(title)s.%(ext)s",
      "--paths",
      item.options.outputDir,
      "--progress",
      "--newline",
    ];

    if (item.options.embedMetadata) args.push("--embed-metadata");
    if (item.options.embedThumbnail) args.push("--embed-thumbnail");
    if (!item.options.allowPlaylists) args.push("--no-playlist");

    // capture exact final filepath
    args.push("--print", "after_move:%(filepath)s");

    const proc = spawn(ytDlpPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = proc;

    let stdoutBuf = "";
    let stderrBuf = "";
    let stderrAll = "";
    const savedOutputPaths = new Set<string>();

    // NEW: prevent double-fail / overwritten error on close
    let terminatedEarly = false;

    const failActiveItem = (friendlyMessage: string) => {
      if (terminatedEarly) return;
      terminatedEarly = true;

      // Only fail if it’s still the active download and not already canceled
      if (item.status === "canceled") return;

      item.status = "failed";
      item.error = friendlyMessage;
      item.finishedAt = new Date().toISOString();

      this.pushState();

      // Kill the process; close handler will fire, but we’ll avoid overwriting
      proc.kill("SIGKILL");
    };

    const setOutputPath = (filePath: string, saveToHistory = false) => {
      item.outputPath = filePath;
      item.title = titleFromPath(filePath) || item.title;

      if (saveToHistory && !savedOutputPaths.has(filePath)) {
        savedOutputPaths.add(filePath);
        saveRecentDownload(fileHistoryItem(item, filePath));
      }

      this.pushState();
    };

    const markConverting = (stage: ConversionStage) => {
      if (item.status === "canceled" || item.status === "failed") return;
      if (item.status !== "converting") {
        item.status = "converting";
        item.progress.percent = 100;
      }

      const expectedStages = conversionStagesForItem(item);
      const stageIndex = expectedStages.indexOf(stage);
      const completedStages =
          stageIndex > 0 ? expectedStages.slice(0, stageIndex) : [];

      item.conversionProgress = {
        currentStage: stage,
        completedStages,
      };

      this.pushState();
    };

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // yt-dlp prints full filepath here
      if (trimmed.startsWith("/") || /^[A-Za-z]:\\/.test(trimmed)) {
        setOutputPath(trimmed, true);
        return;
      }

      const destinationMatch = trimmed.match(
          /^\[(?:ExtractAudio|Merger|VideoConvertor|MoveFiles)]\s+(?:Destination|Moving file to):\s+(.+)$/i,
      );
      if (destinationMatch?.[1]) {
        setOutputPath(destinationMatch[1].trim());
      }

      if (/^\[(?:ExtractAudio|Metadata|EmbedThumbnail|VideoConvertor|Fixup|MoveFiles)]/i.test(trimmed)) {
        markConverting(conversionStageFromLine(trimmed));
        return;
      }

      // Parse yt-dlp download progress lines
      if (trimmed.startsWith("[download]")) {
        const percentMatch = trimmed.match(/(\d+(?:\.\d+)?)%/);
        const totalMatch = trimmed.match(/of\s+([^\s]+)\s+at/i);
        const speedMatch = trimmed.match(/at\s+([^\s]+)\s+ETA/i);
        const etaMatch = trimmed.match(/ETA\s+([0-9:]+)/i);

        if (percentMatch) item.progress.percent = Number(percentMatch[1]);
        if (totalMatch) item.progress.total = totalMatch[1];
        if (speedMatch) item.progress.speed = speedMatch[1];
        if (etaMatch) item.progress.eta = etaMatch[1];
        if (item.progress.percent >= 100) markConverting("extract");

        this.pushState();
        return;
      }

      // fallback percent parsing
      const m = trimmed.match(/(\d+(?:\.\d+)?)%/);
      if (m) {
        if (item.status !== "converting") {
          item.progress.percent = Number(m[1]);
          if (item.progress.percent >= 100) markConverting("extract");
          this.pushState();
        }
      }
    };

    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");

    proc.stdout?.on("data", (chunk: string) => {
      stdoutBuf += chunk;
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";

      for (const line of lines) {
        handleLine(line);
      }
    });

    // UPDATED: detect geo/hidden errors early and advance queue
    proc.stderr?.on("data", (chunk: string) => {
      stderrAll += chunk;
      stderrBuf += chunk;
      const lines = stderrBuf.split("\n");
      stderrBuf = lines.pop() ?? "";

      for (const line of lines) {
        handleLine(line);
      }

      const lower = stderrAll.toLowerCase();
      if (LOCATION_ERRORS.some((s) => lower.includes(s))) {
        failActiveItem("Unavailable in your location (geo-restricted/hidden).");
      }
    });

    proc.on("close", (code) => {
      this.proc = null;
      this.activeId = null;

      // If we already failed early (and set a friendly message), don’t overwrite it.
      if (terminatedEarly) {
        // If user canceled after we started terminating, keep canceled
        if (item.status !== "canceled" && !item.finishedAt) {
          item.finishedAt = new Date().toISOString();
        }
        this.pushState();
        this.startNext();
        return;
      }

      if (code === 0) {
        item.status = "completed";
        item.progress.percent = 100;
        item.conversionProgress = {
          currentStage: "done",
          completedStages: conversionStagesForItem(item),
        };
        if (!savedOutputPaths.size && item.outputPath) {
          saveRecentDownload(fileHistoryItem(item, item.outputPath));
        }
      } else if (item.status !== "canceled") {
        item.status = "failed";
        item.error = (stderrAll || stderrBuf).trim();
      }

      item.finishedAt = new Date().toISOString();
      this.pushState();
      this.startNext();
    });
  }
  clearFinished() {
    // Keep active + pending items
    this.items = this.items.filter(
        (i) =>
            i.status === "pending" ||
            i.status === "downloading" ||
            i.status === "converting",
    );

    this.pushState();
  }
}

function urlNormalize(url: string) {
  return url.trim();
}

function titleFromPath(filePath: string) {
  const parsed = path.parse(filePath);
  return parsed.name;
}

function conversionStageFromLine(line: string): ConversionStage {
  if (line.startsWith("[ExtractAudio]")) return "extract";
  if (line.startsWith("[Metadata]")) return "metadata";
  if (line.startsWith("[EmbedThumbnail]")) return "thumbnail";
  if (line.startsWith("[VideoConvertor]")) return "extract";
  if (line.startsWith("[Fixup]")) return "finalize";
  if (line.startsWith("[MoveFiles]")) return "move";
  return "finalize";
}

function conversionStagesForItem(item: DownloadItem): ConversionStage[] {
  return [
    "extract",
    ...(item.options.embedMetadata ? ["metadata" as const] : []),
    ...(item.options.embedThumbnail ? ["thumbnail" as const] : []),
    "finalize",
    "move",
    "done",
  ];
}

function saveRecentDownload(item: DownloadItem) {
  const history = store.get("history") ?? [];
  const next = [
    { ...item },
    ...history.filter(
        (existing) =>
            existing.id !== item.id && existing.outputPath !== item.outputPath,
    ),
  ].slice(0, 10);

  store.set("history", next);
}

function fileHistoryItem(item: DownloadItem, filePath: string): DownloadItem {
  return {
    ...item,
    id: `${item.id}:${filePath}`,
    title: titleFromPath(filePath) || item.title,
    status: "completed",
    progress: {
      ...item.progress,
      percent: 100,
    },
    conversionProgress: {
      currentStage: "done",
      completedStages: conversionStagesForItem(item),
    },
    outputPath: filePath,
    finishedAt: new Date().toISOString(),
  };
}
