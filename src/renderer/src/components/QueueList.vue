<script setup lang="ts">
import type { QueueState, DownloadItem } from "../types";

defineProps<{ state: QueueState }>();

function pct(item: DownloadItem) {
    const p = item.progress?.percent ?? 0;
    return Math.max(0, Math.min(100, p));
}

function statusLabel(item: DownloadItem) {
    if (item.status === "downloading") return "Downloading";
    if (item.status === "pending") return "Pending";
    if (item.status === "completed") return "Completed";
    if (item.status === "failed") return "Failed";
    if (item.status === "canceled") return "Canceled";
    if (item.status === "skipped") return "Unavailable";
    return item.status;
}

// Avoid referencing `window.api` directly in the template (preload may be missing,
// and Vue template type-checking will complain about `window.api`).
function requireApi() {
    if (!window.api) {
        console.error("window.api is missing — preload did not load.");
        return null;
    }
    return window.api;
}

function onCancel(id: string) {
    requireApi()?.queue.cancel(id);
}

function onRetry(id: string) {
    requireApi()?.queue.retry(id);
}

function onRemove(id: string) {
    requireApi()?.queue.remove(id);
}

function dirnameFromPath(p: string) {
    // Handles:
    // - /a/b/file.ext  -> /a/b
    // - C:\a\b\file.ext -> C:\a\b
    // - already-a-dir -> best effort (returns parent anyway if it ends with file)
    if (!p) return p;
    const normalized = p.replace(/\\/g, "/");
    const i = normalized.lastIndexOf("/");
    if (i <= 0) return p;
    return normalized.slice(0, i);
}

function onOpenFolder(path: string) {
    const dir = dirnameFromPath(path);
    requireApi()?.shell.openPath(dir);
}
</script>

<template>
    <section class="queue">
        <header class="queue__header">
            <div>
                <h2 class="queue__title">Queue</h2>
                <p class="queue__hint">
                    Newest on top. Click actions per item.
                </p>
            </div>

            <div class="queue__meta">
                <span
                    class="pill"
                    :data-tone="state.items.length ? 'good' : 'neutral'"
                >
                    <span class="pill__dot" aria-hidden="true" />
                    <span class="pill__text">
                        {{ state.items.length }}
                        {{ state.items.length === 1 ? "item" : "items" }}
                    </span>
                </span>
            </div>
        </header>

        <div class="queue__body">
            <div v-if="state.items.length === 0" class="empty">
                <div class="empty__box">
                    <div class="empty__title">No downloads yet.</div>
                    <div class="empty__text">
                        Paste a link above to start building your vault.
                    </div>
                </div>
            </div>

            <article
                v-for="item in state.items.slice().reverse()"
                :key="item.id"
                class="item"
                :data-status="item.status"
            >
                <div class="item__top">
                    <div class="item__left">
                        <div
                            class="item__title"
                            :title="item.title || item.url"
                        >
                            {{ item.title || item.url }}
                        </div>
                        <div class="item__url" :title="item.url">
                            {{ item.url }}
                        </div>
                    </div>

                    <div class="item__right">
                        <div class="badge" :data-status="item.status">
                            {{ statusLabel(item) }}
                        </div>

                        <div
                            v-if="item.status === 'downloading'"
                            class="item__sub"
                        >
                            <span class="item__speed">{{
                                item.progress.speed || ""
                            }}</span>
                            <span v-if="item.progress.eta" class="item__eta"
                                >• ETA {{ item.progress.eta }}</span
                            >
                        </div>
                    </div>
                </div>

                <div class="item__progress">
                    <div
                        class="bar"
                        role="progressbar"
                        :aria-valuenow="pct(item)"
                        aria-valuemin="0"
                        aria-valuemax="100"
                    >
                        <div
                            class="bar__fill"
                            :style="{ width: pct(item) + '%' }"
                        ></div>
                    </div>

                    <div class="item__progressMeta">
                        <span class="item__pct"
                            >{{ pct(item).toFixed(1) }}%</span
                        >
                        <span v-if="item.progress.total" class="item__total">{{
                            item.progress.total
                        }}</span>
                    </div>
                </div>

                <!-- UPDATED: show message for failed OR skipped -->
                <div
                    v-if="item.status === 'failed' || item.status === 'skipped'"
                    class="error"
                    role="alert"
                >
                    <div class="error__label">
                        {{
                            item.status === "skipped" ? "Unavailable" : "Error"
                        }}
                    </div>
                    <div class="error__msg">{{ item.error }}</div>
                </div>

                <div class="item__actions">
                    <button
                        v-if="item.status === 'downloading'"
                        class="btn btn--soft"
                        type="button"
                        @click="onCancel(item.id)"
                    >
                        Cancel
                    </button>

                    <!-- UPDATED: retry for failed/canceled/skipped -->
                    <button
                        v-if="
                            item.status === 'failed' ||
                            item.status === 'canceled' ||
                            item.status === 'skipped'
                        "
                        class="btn btn--leaf"
                        type="button"
                        @click="onRetry(item.id)"
                    >
                        Retry
                    </button>

                    <button
                        v-if="item.status !== 'downloading'"
                        class="btn btn--soft"
                        type="button"
                        @click="onRemove(item.id)"
                    >
                        Remove
                    </button>

                    <button
                        v-if="item.status === 'completed'"
                        class="btn btn--guava"
                        type="button"
                        @click="onOpenFolder(item.outputPath)"
                    >
                        Open folder
                    </button>
                </div>
            </article>
        </div>
    </section>
</template>

<style scoped>
.queue {
    background: var(--card);
    border: 3px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
    display: flex;
    flex-direction: column;

    /* KEY: allow the scroll child to size correctly */
    height: 100%;
    padding: 2rem;
}

.queue__header {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 3px solid var(--border);
    background:
        linear-gradient(0deg, #ffffff, #ffffff),
        linear-gradient(90deg, var(--leaf-soft), var(--guava-soft));
    background-blend-mode: normal, multiply;
}

.queue__title {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.01em;
}

.queue__hint {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

.queue__meta {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* Pill matches AddDownload */
.pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 3px solid var(--border);
    border-radius: 999px;
    padding: 8px 12px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
    user-select: none;
    flex: 0 0 auto;
}

.pill__dot {
    width: 10px;
    height: 10px;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--guava);
}

.pill[data-tone="good"] .pill__dot {
    background: var(--leaf);
}

.pill__text {
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.02em;
}

.queue__body {
    flex: 1 1 auto;
    min-height: 0; /* KEY: required for flex scrolling */
    overflow-y: auto;
    overflow-x: hidden;

    padding: 14px 16px 16px;
    display: grid;
    gap: 12px;

    /* Optional: nicer scrollbar */
    scrollbar-width: auto;
    scrollbar-color: var(--ink) transparent;
}

.queue__body::-webkit-scrollbar {
    width: 12px;
}

.queue__body::-webkit-scrollbar-track {
    background: transparent;
}

.queue__body::-webkit-scrollbar-thumb {
    background: var(--ink);
    border-radius: 999px;
    border: 3px solid var(--bg);
}

/* Empty state */
.empty {
    padding: 2px 0 6px;
}

.empty__box {
    border: 3px solid var(--border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 6px 6px 0 var(--ink);
    padding: 14px 14px;
}

.empty__title {
    font-weight: 950;
    letter-spacing: -0.01em;
}

.empty__text {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 650;
    color: var(--muted);
}

/* Item card */
.item {
    border: 3px solid var(--border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 6px 6px 0 var(--ink);
    padding: 12px 12px;
    min-width: 0;
}

.item__top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
}

.item__left {
    min-width: 0;
}

.item__title {
    font-weight: 950;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.item__url {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 650;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.item__right {
    text-align: right;
    flex: 0 0 auto;
    display: grid;
    justify-items: end;
    gap: 6px;
}

.item__sub {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
}

/* Status badge */
.badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 3px solid var(--border);
    border-radius: 999px;
    box-shadow: 4px 4px 0 var(--ink);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #fff;
}

.badge::before {
    content: "";
    width: 10px;
    height: 10px;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--guava);
}

/* You can tune these to match your exact status values */
.badge[data-status="queued"]::before {
    background: var(--guava);
}
.badge[data-status="downloading"]::before {
    background: var(--leaf);
}
.badge[data-status="completed"]::before {
    background: var(--leaf);
}
.badge[data-status="failed"]::before {
    background: var(--guava);
}
.badge[data-status="canceled"]::before {
    background: #bbb;
}

/* Progress */
.item__progress {
    margin-top: 10px;
}

.bar {
    height: 12px;
    border: 3px solid var(--border);
    border-radius: 999px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
    overflow: hidden;
}

.bar__fill {
    height: 100%;
    background: var(--ink);
    width: 0%;
}

/* Make completed feel guava/leaf-ish */
.item[data-status="completed"] .bar__fill {
    background: var(--leaf);
}
.item[data-status="failed"] .bar__fill {
    background: var(--guava);
}
.item[data-status="canceled"] .bar__fill {
    background: #bbb;
}

.item__progressMeta {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
}

/* Error block */
.error {
    margin-top: 10px;
    border: 3px solid var(--border);
    border-radius: 16px;
    background: var(--guava-soft);
    box-shadow: 6px 6px 0 var(--ink);
    padding: 10px 12px;
}

.error__label {
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.error__msg {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 750;
    white-space: pre-wrap;
}

/* Actions */
.item__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
}

/* Buttons (matches AddDownload vibe) */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 12px;
    border: 3px solid var(--border);
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    font-weight: 950;
    cursor: pointer;
    box-shadow: 6px 6px 0 var(--ink);
    transition:
        transform 120ms ease,
        box-shadow 120ms ease;
}

.btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 8px 8px 0 var(--ink);
}

.btn:active {
    transform: translate(2px, 2px);
    box-shadow: 4px 4px 0 var(--ink);
}

.btn--soft {
    background: #fff;
}

.btn--guava {
    background: linear-gradient(0deg, var(--guava), var(--guava));
}

.btn--leaf {
    background: linear-gradient(0deg, var(--leaf), var(--leaf));
}

@media (max-width: 720px) {
    .queue__header {
        flex-direction: column;
        align-items: stretch;
    }

    .queue__meta {
        justify-content: flex-start;
    }

    .item__top {
        flex-direction: column;
        align-items: stretch;
    }

    .item__right {
        justify-items: start;
        text-align: left;
    }

    .item__actions .btn {
        width: 100%;
    }
}

/* Status badge */
.badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 3px solid var(--border);
    border-radius: 999px;
    box-shadow: 4px 4px 0 var(--ink);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #fff;
}

.badge::before {
    content: "";
    width: 10px;
    height: 10px;
    border: 2px solid var(--border);
    border-radius: 999px;
    background: var(--guava);
}

/* FIXED: your status is "pending", not "queued" */
.badge[data-status="pending"]::before {
    background: var(--guava);
}
.badge[data-status="downloading"]::before {
    background: var(--leaf);
}
.badge[data-status="completed"]::before {
    background: var(--leaf);
}
.badge[data-status="failed"]::before {
    background: var(--guava);
}
.badge[data-status="canceled"]::before {
    background: #bbb;
}
.badge[data-status="skipped"]::before {
    background: #bbb;
}

/* Progress fill */
.item[data-status="completed"] .bar__fill {
    background: var(--leaf);
}
.item[data-status="failed"] .bar__fill {
    background: var(--guava);
}
.item[data-status="canceled"] .bar__fill {
    background: #bbb;
}
/* NEW: skipped looks neutral */
.item[data-status="skipped"] .bar__fill {
    background: #bbb;
}

/* If you want skipped to look less like an "error" block,
   you can optionally override the error background: */
.item[data-status="skipped"] .error {
    background: #fff;
}
</style>
