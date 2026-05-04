<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import type { DownloadItem, QueueState, Settings } from "./types";
import AddDownload from "./components/AddDownload.vue";
import QueueList from "./components/QueueList.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import LimitDialog from "./components/LimitDialog.vue";

const state = ref<QueueState>({ items: [], activeId: null });
const history = ref<DownloadItem[]>([]);
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
  history.value = await window.api.history.get();
  unsub = window.api.queue.onUpdated((s) => {
    state.value = s;
    mergeCompletedIntoHistory(s.items);
  });
});

onBeforeUnmount(() => {
  unsub?.();
});

async function saveSettings(next: Settings) {
  if (!hasApi()) return;
  settings.value = await window.api.settings.set(next);
}

const recentDownloads = computed<DownloadItem[]>(() => {
  const byId = new Map<string, DownloadItem>();

  for (const item of history.value) {
    if (item.status === "completed" && item.outputPath) byId.set(item.id, item);
  }

  for (const item of state.value.items) {
    if (item.status === "completed" && item.outputPath) byId.set(item.id, item);
  }

  return [...byId.values()]
      .sort((a, b) => {
        return (
            new Date(b.finishedAt || b.createdAt).getTime() -
            new Date(a.finishedAt || a.createdAt).getTime()
        );
      })
      .slice(0, 5);
});

function mergeCompletedIntoHistory(items: DownloadItem[]) {
  const completed = items.filter(
      (item) => item.status === "completed" && item.outputPath,
  );
  if (!completed.length) return;

  const byId = new Map<string, DownloadItem>();
  for (const item of [...completed, ...history.value]) {
    byId.set(item.id, item);
  }

  history.value = [...byId.values()]
      .sort((a, b) => {
        return (
            new Date(b.finishedAt || b.createdAt).getTime() -
            new Date(a.finishedAt || a.createdAt).getTime()
        );
      })
      .slice(0, 10);
}

function isDuplicateUrl(u: string) {
  const url = u.trim();
  return state.value.items.some(
      (item) =>
          item.url === url &&
          (item.status === "pending" ||
              item.status === "downloading" ||
              item.status === "converting"),
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
  window.api.shell.openPath("https://headlessflower.dev/app/fetchr-pro");
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
        <div class="brand__text">
          <h1 class="brand__title">fetchr</h1>
          <p class="brand__tagline">
            Fetch audio for research and planning
          </p>
        </div>
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
                :recent-downloads="recentDownloads"
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
  height: 100%;
  min-height: 0;

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

  overflow-y: auto;
  display: flex;
  flex-direction: column;

}

.app__header,
.app__layout {
  max-width: 72.5rem; /* ~1160px */
  margin-inline: auto;
}



/* Header*/
.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem;
  flex: 0 0 auto;
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

/* Layout */
.app__layout {
  display: grid;
  grid-template-columns: 1fr minmax(18rem, 23.75rem);
  grid-template-rows: minmax(0, 1fr);
  gap: 1rem;

  flex: 1 1 auto;
  margin-top: 1rem;

  min-height: 0;
  min-width: 0;

}

.app__main {
  display: grid;
  grid-template-rows: auto 1fr;
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
  flex-direction: column;
  min-height: 0;
}

/* Scroll lives inside the body to keep headers stable */
.panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  padding: 1rem;
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

}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
