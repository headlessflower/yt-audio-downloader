<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import type { QueueState, Settings } from "./types";
import AddDownload from "./components/AddDownload.vue";
import QueueList from "./components/QueueList.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import LimitDialog from "./components/LimitDialog.vue";

const state = ref<QueueState>({ items: [], activeId: null });
const settings = ref<Settings>({
    outputDir: "",
    audioFormat: "mp3",
    embedMetadata: true,
    embedThumbnail: true,
    allowPlaylists: false,
});

const limitOpen = ref(false);
const limitInfo = ref({ limit: 10, current: 10 });
const limitMessage = ref("");

const theme = ref<"dark" | "light">("dark");

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

    const res = await window.api.queue.add(url, opts);

    if (!res.ok) {
        if (res.error?.code === "QUEUE_LIMIT") {
            limitInfo.value = {
                limit: Number(res.error.limit ?? 10),
                current: Number(res.error.current ?? state.value.items.length),
            };
            limitMessage.value =
                res.error.message ??
                `Queue limit reached (${limitInfo.value.limit}).`;
            limitOpen.value = true;
            return;
        }
        console.error("queue:add failed:", res.error);
        return;
    }
}
function closeLimitDialog() {
    limitOpen.value = false;
}

function upgradeFromLimitDialog() {
    limitOpen.value = false;
    window.api.shell.openPath("https://headlessflower.dev/app/guava-music-pro");
}
</script>

<template>
    <div class="app">
        <header class="app__header">
            <LimitDialog
                :open="limitOpen"
                :limit="limitInfo.limit"
                :current="limitInfo.current"
                :message="limitMessage"
                @close="closeLimitDialog"
                @upgrade="upgradeFromLimitDialog"
            />

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
/* GNOME-ish dark shell (replaces neo-brutalist look)
   - Flat surfaces, subtle 1px separators
   - Airy spacing + readable type
   - Responsive units (rem/em/vh/vw); 1px borders only px exception
   - Assumes your dark theme tokens:
     --bg, --surface, --text, --muted, --accent, --border, --radius
*/

.app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family:
        ui-sans-serif,
        system-ui,
        -apple-system,
        Segoe UI,
        Roboto,
        Arial,
        "Apple Color Emoji",
        "Segoe UI Emoji";

    padding: 1.125rem;
}

/* Constrain width but keep it roomy */
.app__header,
.app__layout {
    max-width: 72.5rem; /* ~1160px */
    margin-inline: auto;
}

/* Header (GNOME headerbar-ish) */
.app__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.875rem;

    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);

    padding: 0.875rem 1rem;
}

/* Brand cluster */
.brand {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 0;
}

.brand__logo {
    inline-size: 3rem;
    block-size: 3rem;
    object-fit: contain;

    /* GNOME-ish: no framed badge, just a quiet surface */
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius) * 0.8);
    padding: 0.25rem;
}

.brand__text {
    min-width: 0;
}

.brand__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    line-height: 1.2;
    color: var(--text);
}

.brand__tagline {
    margin: 0.25rem 0 0;
    color: var(--muted);
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.35;
}

/* Right side status cluster */
.status {
    display: flex;
    align-items: center;
    gap: 0.625rem;
}

/* GNOME-ish chip: subtle, not shouty */
.status__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    border: 1px solid var(--border);
    border-radius: 999rem;
    padding: 0.5rem 0.75rem;

    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
    color: var(--text);

    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

/* Layout */
.app__layout {
    display: grid;
    grid-template-columns: 1fr minmax(18rem, 23.75rem); /* ~380px max */
    gap: 1rem;

    margin-top: 1rem;

    /* keeps content from fighting the viewport while staying responsive */
    min-height: calc(100vh - 6.5rem);
}

.app__main {
    display: grid;
    grid-template-rows: auto 1fr; /* AddDownload then QueueList */
    gap: 1rem;
    min-height: 0;
}

.app__aside {
    display: grid;
    gap: 1rem;
    min-height: 0;
}

/* Panels (GNOME surfaces) */
.panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    display: flex;
    overflow: hidden;

    min-height: 0;
}

/* Scroll lives inside the body to keep headers stable */
.panel__body {
    padding: 1.25rem;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;

    min-height: 0;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
}

/* Sticky settings on desktop */
.panel--sticky {
    position: sticky;
    top: 1rem;
}

/* Panel header */
.panel__header {
    display: flex;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex: 0 0 auto;
}

.panel__title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    color: var(--text);
}

.panel__hint {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--muted);
    font-weight: 500;
    line-height: 1.35;
}

/* Responsive */
@media (max-width: 61.25rem) {
    /* ~980px */
    .app {
        padding: 1rem;
    }

    .app__layout {
        grid-template-columns: 1fr;
        min-height: auto;
    }

    .panel--sticky {
        position: static;
    }

    .status__chip {
        display: none;
    }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    * {
        transition: none !important;
        scroll-behavior: auto !important;
    }
}
</style>
