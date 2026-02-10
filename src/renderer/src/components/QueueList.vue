<script setup lang="ts">
import type { QueueState, DownloadItem } from "../types";
import ClearQueue from "./ClearQueue.vue";
import { computed } from "vue";

const props = defineProps<{ state: QueueState }>();

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
const hasFinished = computed(() =>
    props.state.items.some(
        (i) =>
            i.status === "completed" ||
            i.status === "failed" ||
            i.status === "canceled" ||
            i.status === "skipped",
    ),
);
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
                <ClearQueue :disabled="!hasFinished" />
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
/* GNOME-ish dark-only Queue
   - Flat surfaces, subtle separators, calm focus rings
   - Responsive units (rem/em/vw/vh); 1px borders are the only px exception
   - Assumes dark theme tokens: --bg --surface --text --muted --accent --border --radius
*/

.queue {
    --pad: 1.25rem;
    --pad-sm: 1rem;
    --gap: 0.75rem;

    --surface-2: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
    --surface-3: color-mix(in srgb, var(--surface) 86%, var(--text) 14%);
    --ring: color-mix(in srgb, var(--accent) 55%, transparent);

    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);

    display: flex;
    flex-direction: column;

    height: 50vh;
    min-height: 0;
    overflow-y: auto;
}

/* Header */
.queue__header {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    padding: var(--pad-sm) var(--pad);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
}

.queue__title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    color: var(--text);
}

.queue__hint {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--muted);
    font-weight: 500;
    line-height: 1.35;
}

.queue__meta {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

/* GNOME-ish pill */
.pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    border: 1px solid var(--border);
    border-radius: 999rem;
    padding: 0.5rem 0.75rem;

    background: var(--surface-2);
    color: var(--text);

    user-select: none;
    flex: 0 0 auto;

    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.pill__dot {
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-radius: 999rem;
    background: var(--accent);
}

.pill[data-tone="good"] .pill__dot {
    background: color-mix(in srgb, var(--accent) 45%, #22c55e 55%);
}

.pill__text {
    font-weight: 650;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
}

/* Body (scroll region) */
.queue__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: var(--pad-sm) var(--pad);
    display: grid;
    gap: var(--gap);

    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--text) 35%, transparent)
        transparent;
}

.queue__body::-webkit-scrollbar {
    width: 0.75rem;
}

.queue__body::-webkit-scrollbar-track {
    background: transparent;
}

.queue__body::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--text) 30%, transparent);
    border-radius: 999rem;
    border: 0.2rem solid transparent;
    background-clip: padding-box;
}

/* Empty state */
.empty {
    padding: 0.25rem 0;
}

.empty__box {
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);
    background: var(--surface-2);
    padding: 1rem;
}

.empty__title {
    font-weight: 650;
    letter-spacing: 0.01em;
    color: var(--text);
}

.empty__text {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--muted);
    line-height: 1.35;
}

/* Item card */
.item {
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);
    background: var(--surface-2);
    padding: 0.875rem 1rem;
    min-width: 0;
}

/* Optional selection/hover affordance (quiet) */
.item:hover {
    background: color-mix(in srgb, var(--surface-2) 88%, var(--text) 12%);
}

.item__top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.item__left {
    min-width: 0;
}

.item__title {
    font-weight: 650;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    color: var(--text);
}

.item__url {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
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
    gap: 0.375rem;
}

.item__sub {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--muted);
}

/* Status badge (quiet) */
.badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    padding: 0.375rem 0.625rem;
    border: 1px solid var(--border);
    border-radius: 999rem;

    background: var(--surface-3);
    color: var(--text);

    font-size: 0.75rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.badge::before {
    content: "";
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-radius: 999rem;
    background: var(--accent);
}

/* Status dot mapping */
.badge[data-status="pending"]::before {
    background: color-mix(in srgb, var(--accent) 25%, var(--muted));
}
.badge[data-status="downloading"]::before {
    background: var(--accent);
}
.badge[data-status="completed"]::before {
    background: #22c55e;
}
.badge[data-status="failed"]::before {
    background: #ef4444;
}
.badge[data-status="canceled"]::before {
    background: color-mix(in srgb, var(--muted) 70%, transparent);
}
.badge[data-status="skipped"]::before {
    background: color-mix(in srgb, var(--muted) 70%, transparent);
}

/* Progress */
.item__progress {
    margin-top: 0.75rem;
}

.bar {
    block-size: 0.5rem;
    border-radius: 999rem;
    background: color-mix(in srgb, var(--surface) 80%, var(--text) 20%);
    overflow: hidden;
}

.bar__fill {
    block-size: 100%;
    background: var(--accent);
    width: 0%;
    transition: width 180ms ease;
}

.item[data-status="completed"] .bar__fill {
    background: #22c55e;
}
.item[data-status="failed"] .bar__fill {
    background: #ef4444;
}
.item[data-status="canceled"] .bar__fill,
.item[data-status="skipped"] .bar__fill {
    background: color-mix(in srgb, var(--muted) 70%, transparent);
}

.item__progressMeta {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.375rem;

    font-size: 0.875rem;
    font-weight: 500;
    color: var(--muted);
}

/* Error block */
.error {
    margin-top: 0.75rem;
    border: 1px solid color-mix(in srgb, #ef4444 55%, var(--border));
    border-radius: calc(var(--radius) * 0.9);
    background: color-mix(in srgb, #ef4444 12%, var(--surface));
    padding: 0.75rem 1rem;
    color: var(--text);
}

.error__label {
    font-size: 0.75rem;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: color-mix(in srgb, var(--text) 80%, var(--muted));
}

.error__msg {
    margin-top: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: pre-wrap;
    line-height: 1.35;
}

/* Actions */
.item__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

/* Buttons (GNOME-ish) */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    padding: 0.625rem 0.875rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);

    background: var(--surface-3);
    color: var(--text);

    font-weight: 650;
    font-size: 0.875rem;

    cursor: pointer;
    transition:
        background 120ms ease,
        border-color 120ms ease,
        box-shadow 120ms ease;
}

.btn:hover {
    background: color-mix(in srgb, var(--surface-3) 88%, var(--text) 12%);
}

.btn:active {
    background: color-mix(in srgb, var(--surface-3) 82%, var(--text) 18%);
}

.btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 0.2rem var(--ring);
}

/* Tone variants (subtle, still GNOME) */
.btn--soft {
    background: var(--surface-3);
}

.btn--guava {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.btn--leaf {
    border-color: color-mix(in srgb, #22c55e 55%, var(--border));
    background: color-mix(in srgb, #22c55e 14%, var(--surface));
}

/* Mobile */
@media (max-width: 45rem) {
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
        inline-size: 100%;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    .bar__fill {
        transition: none;
    }
}
</style>
