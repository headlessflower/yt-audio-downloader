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

function onOpenFolder(path: string) {
    requireApi()?.shell.openPath(path);
}
</script>

<template>
    <section style="border: 1px solid #ddd; border-radius: 12px; padding: 12px">
        <h2 style="margin: 0 0 10px 0; font-size: 16px">Queue</h2>

        <div v-if="state.items.length === 0" style="opacity: 0.7">
            No downloads yet.
        </div>

        <div
            v-for="item in state.items.slice().reverse()"
            :key="item.id"
            style="
                border: 1px solid #eee;
                border-radius: 12px;
                padding: 10px;
                margin-bottom: 10px;
            "
        >
            <div
                style="display: flex; justify-content: space-between; gap: 10px"
            >
                <div style="min-width: 0">
                    <div
                        style="
                            font-weight: 600;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        "
                    >
                        {{ item.title || item.url }}
                    </div>
                    <div
                        style="
                            font-size: 12px;
                            opacity: 0.7;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        "
                    >
                        {{ item.url }}
                    </div>
                </div>

                <div style="text-align: right; font-size: 12px">
                    <div :style="{ fontWeight: 600 }">
                        {{ statusLabel(item) }}
                    </div>
                    <div
                        v-if="item.status === 'downloading'"
                        style="opacity: 0.7"
                    >
                        {{ item.progress.speed || "" }}
                        {{
                            item.progress.eta
                                ? `• ETA ${item.progress.eta}`
                                : ""
                        }}
                    </div>
                </div>
            </div>

            <div style="margin-top: 8px">
                <div
                    style="
                        height: 8px;
                        background: #eee;
                        border-radius: 999px;
                        overflow: hidden;
                    "
                >
                    <div
                        :style="{
                            width: pct(item) + '%',
                            height: '100%',
                            background: '#111',
                        }"
                    ></div>
                </div>
                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        opacity: 0.7;
                        margin-top: 4px;
                    "
                >
                    <span>{{ pct(item).toFixed(1) }}%</span>
                    <span v-if="item.progress.total">{{
                        item.progress.total
                    }}</span>
                </div>
            </div>

            <div
                v-if="item.status === 'failed'"
                style="
                    margin-top: 8px;
                    color: #a00;
                    font-size: 12px;
                    white-space: pre-wrap;
                "
            >
                {{ item.error }}
            </div>

            <div
                style="
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                    flex-wrap: wrap;
                "
            >
                <button
                    v-if="item.status === 'downloading'"
                    @click="onCancel(item.id)"
                    style="
                        padding: 8px 10px;
                        border-radius: 10px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                    "
                >
                    Cancel
                </button>

                <button
                    v-if="
                        item.status === 'failed' || item.status === 'canceled'
                    "
                    @click="onRetry(item.id)"
                    style="
                        padding: 8px 10px;
                        border-radius: 10px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                    "
                >
                    Retry
                </button>

                <button
                    v-if="item.status !== 'downloading'"
                    @click="onRemove(item.id)"
                    style="
                        padding: 8px 10px;
                        border-radius: 10px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                    "
                >
                    Remove
                </button>

                <button
                    v-if="item.status === 'completed'"
                    @click="onOpenFolder(item.outputPath)"
                    style="
                        padding: 8px 10px;
                        border-radius: 10px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                    "
                >
                    Open folder
                </button>
            </div>
        </div>
    </section>
</template>
