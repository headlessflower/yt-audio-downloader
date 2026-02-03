<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import type { QueueState, Settings } from "./types";
import AddDownload from "./components/AddDownload.vue";
import QueueList from "./components/QueueList.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

const state = ref<QueueState>({ items: [], activeId: null });
const settings = ref<Settings>({
    outputDir: "",
    audioFormat: "mp3",
    embedMetadata: true,
    embedThumbnail: true,
    allowPlaylists: false,
});

let unsub: null | (() => void) = null;

function hasApi(): boolean {
    return typeof window !== "undefined" && !!window.api;
}

onMounted(async () => {
    if (!hasApi()) {
        console.error("window.api is missing — preload did not load.");
        return;
    }

    settings.value = await window.api.settings.get();
    state.value = await window.api.queue.get();
    unsub = window.api.queue.onUpdated((s) => (state.value = s));
});

onBeforeUnmount(() => {
    unsub?.();
});

async function saveSettings(next: Settings) {
    if (!hasApi()) return;
    settings.value = await window.api.settings.set(next);
}

function isDuplicateUrl(u: string) {
    const url = u.trim();
    return state.value.items.some(
        (item) =>
            item.url === url &&
            (item.status === "pending" || item.status === "downloading"),
    );
}

async function addToQueue(payload: {
    url: string;
    overrides: Partial<Settings>;
}) {
    if (!window.api?.queue) return;

    const url = payload.url.trim();
    if (!url) return;

    if (isDuplicateUrl(url)) {
        console.log("Skipping duplicate URL already in queue:", url);
        return;
    }

    const opts = { ...settings.value, ...payload.overrides };
    await window.api.queue.add(url, opts);
}
</script>

<template>
    <div
        style="
            font-family: system-ui;
            padding: 16px;
            max-width: 1100px;
            margin: 0 auto;
        "
    >
        <header
            style="
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 12px;
            "
        >
            <h1 style="margin: 0">YT Audio Downloader</h1>
            <small style="opacity: 0.7"
                >Linux + macOS • bundled yt-dlp + ffmpeg • queue</small
            >
        </header>

        <div
            style="
                display: grid;
                grid-template-columns: 1fr 360px;
                gap: 16px;
                margin-top: 16px;
            "
        >
            <main>
                <AddDownload :settings="settings" @add="addToQueue" />
                <div style="margin-top: 16px">
                    <QueueList :state="state" />
                </div>
            </main>

            <aside>
                <SettingsPanel :settings="settings" @save="saveSettings" />
            </aside>
        </div>
    </div>
</template>
