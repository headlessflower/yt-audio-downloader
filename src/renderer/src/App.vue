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
    <div class="app">
        <header class="app__header">
            <div class="brand">
                <img
                    class="brand__logo"
                    src="/src/guava_logo_black.png"
                    alt="Guava Music Vault logo"
                />
                <div class="brand__text">
                    <h1 class="brand__title">Guava Music Vault</h1>
                    <p class="brand__tagline">
                        Save songs for research and planning
                    </p>
                </div>
            </div>

            <div class="status">
                <span class="status__chip">Desktop</span>
            </div>
        </header>

        <div class="app__layout">
            <main class="app__main">
                <section class="panel">
                    <div class="panel__body">
                        <AddDownload :settings="settings" @add="addToQueue" />
                    </div>
                </section>

                <section class="panel">
                    <div class="panel__body">
                        <QueueList :state="state" />
                    </div>
                </section>
            </main>

            <aside class="app__aside">
                <section class="panel panel--sticky">
                    <div class="panel__body">
                        <SettingsPanel
                            :settings="settings"
                            @save="saveSettings"
                        />
                    </div>
                </section>
            </aside>
        </div>
    </div>
</template>

<style scoped>
/* -------------------------------------------------------
   Neo-brutalist theme (Guava palette)
   - thick borders
   - hard shadows
   - loud accent colors
   - simple typography
-------------------------------------------------------- */

/* App shell */
.app {
    height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family:
        ui-sans-serif,
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        Arial,
        "Apple Color Emoji",
        "Segoe UI Emoji";
    padding: 18px;
}

/* Constrain width but keep it roomy */
.app__header,
.app__layout {
    max-width: 1160px;
    margin: 0 auto;
}

/* Header */
.app__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;

    background: var(--card);
    border: 3px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
    padding: 14px 16px;
}

/* Brand cluster */
.brand {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.brand__logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    background: #fff;
    border: 3px solid var(--border);
    border-radius: 14px;
    box-shadow: 5px 5px 0 var(--ink);
    padding: 8px;
}

.brand__text {
    min-width: 0;
}

.brand__title {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.02em;
    line-height: 1.1;
}

.brand__tagline {
    margin: 6px 0 0;
    color: var(--muted);
    font-weight: 600;
    font-size: 13px;
}

/* Right side status chip */
.status {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status__chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;

    border: 3px solid var(--border);
    border-radius: 999px;
    padding: 8px 12px;

    background: linear-gradient(0deg, var(--guava-soft), var(--guava-soft));
    font-weight: 800;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    box-shadow: 5px 5px 0 var(--ink);
}

/* Layout */
.app__layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 16px;
    margin-top: 16px;
    height: calc(100vh - 120px); /* adjust if your header padding differs */
    min-height: 0;
}

.app__main {
    display: grid;
    grid-template-rows: auto 1fr; /* AddDownload then QueueList */
    gap: 16px;
    min-height: 0;
}

.app__aside {
    display: grid;
    gap: 16px;
}

/* Panels (neo-brutalist cards) */
.panel {
    background: var(--card);
    border: 3px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
    overflow: hidden;
}

/* Sticky settings on desktop */
.panel--sticky {
    position: sticky;
    top: 16px;
}

.panel__header {
    padding: 14px 16px;
    border-bottom: 3px solid var(--border);
    background:
        linear-gradient(0deg, #ffffff, #ffffff),
        linear-gradient(90deg, var(--leaf-soft), var(--guava-soft));
    background-blend-mode: normal, multiply;
}

.panel__title {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.01em;
}

.panel__hint {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

.panel__body {
    padding: 2rem;
}

/* Responsive */
@media (max-width: 980px) {
    .app__layout {
        grid-template-columns: 1fr;
    }

    .panel--sticky {
        position: static;
    }

    .status__chip {
        display: none;
    }
}
</style>
