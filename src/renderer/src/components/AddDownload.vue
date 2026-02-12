
<script setup lang="ts">
import { ref, watch } from "vue";
import type { Settings } from "../types";

const props = defineProps<{ settings: Settings }>();
const emit = defineEmits<{
  (e: "add", payload: { url: string; overrides: Partial<Settings> }): void;
}>();

const url = ref("");
const format = ref(props.settings.audioFormat);
const embedMetadata = ref(props.settings.embedMetadata);
const embedThumbnail = ref(props.settings.embedThumbnail);
const allowPlaylists = ref(props.settings.allowPlaylists);

const error = ref<string | null>(null);
const urlCount = ref(0);

watch(url, (val) => {
  error.value = null;
  urlCount.value = extractUrls(val).length;
});

watch(
    () => props.settings,
    (s) => {
      // keep defaults synced if user changes settings in the side panel
      format.value = s.audioFormat;
      embedMetadata.value = s.embedMetadata;
      embedThumbnail.value = s.embedThumbnail;
      allowPlaylists.value = s.allowPlaylists;
    },
    { deep: true },
);

function extractUrls(raw: string): string[] {
  // split by newlines, spaces, tabs
  const parts = raw
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

  // keep only http(s) links (simple but effective)
  const urls = parts.filter((p) => /^https?:\/\//i.test(p));

  // dedupe while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function add() {
  const urls = extractUrls(url.value);

  if (urls.length === 0) {
    error.value = "Paste at least one valid http(s) URL.";
    return;
  }

  for (const u of urls) {
    emit("add", {
      url: u,
      overrides: {
        audioFormat: format.value,
        embedMetadata: embedMetadata.value,
        embedThumbnail: embedThumbnail.value,
        allowPlaylists: allowPlaylists.value,
      },
    });
  }

  url.value = "";
  urlCount.value = 0;
  error.value = null;
}

function onKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl + Enter to add
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault(); // stop any custom menus
  window.api?.ui?.showTextContextMenu?.();
}
</script>

<template>
  <section class="add">
    <div class="add__top">
      <div>
        <h2 class="add__title">Add download</h2>
        <div class="inputTip" role="note">
          Tip: press <kbd>⌘</kbd> + <kbd>V</kbd> to paste a link.
        </div>
        <p class="add__hint">
          Paste one or many links (space/newline separated). Press
          <kbd class="kbd">⌘</kbd>+<kbd class="kbd">↩</kbd>.
        </p>
      </div>

      <div class="pill" :data-tone="urlCount > 0 ? 'good' : 'neutral'">
        <span class="pill__dot" aria-hidden="true" />
        <span class="pill__text">
                    {{ urlCount }} {{ urlCount === 1 ? "link" : "links" }}
                </span>
      </div>
    </div>

    <div class="add__input">
      <label class="sr-only" for="urlbox">URLs</label>
      <textarea
          id="urlbox"
          v-model="url"
          class="textarea"
          placeholder="Paste a URL…"
          rows="3"
          @keydown="onKeydown"
          @contextmenu="onContextMenu"
      />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </div>

    <div class="add__controls">
      <div class="controls">
        <div class="field">
          <span class="field__label">Format</span>
          <select v-model="format" class="select">
            <option value="mp3">MP3</option>
            <option value="opus">OPUS</option>
            <option value="flac">FLAC</option>
          </select>
        </div>

        <label class="check">
          <input
              class="check__box"
              type="checkbox"
              v-model="embedMetadata"
          />
          <span class="check__text">Embed metadata</span>
        </label>

        <label class="check">
          <input
              class="check__box"
              type="checkbox"
              v-model="embedThumbnail"
          />
          <span class="check__text">Embed thumbnail</span>
        </label>

        <label class="check">
          <input
              class="check__box"
              type="checkbox"
              v-model="allowPlaylists"
          />
          <span class="check__text">Allow playlists</span>
        </label>
      </div>

      <button class="btn" type="button" @click="add">
        <span class="btn__icon" aria-hidden="true">＋</span>
        Add to queue
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Uses the same palette as App.vue (via :root). If variables are not global,
   consider moving them to a global stylesheet (e.g., assets/theme.css). */
/* Screen-reader only */
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Local tokens (derived from globals) */
.add {
  --pad: 1rem;
  --pad-lg: 1.25rem;
  --ring: color-mix(in srgb, var(--accent) 55%, transparent);
  --surface-2: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);

  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: clip;
}

/* Header / top area */
.add__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  padding: var(--pad-lg);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.add__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: var(--text);
}

.add__hint {
  margin: 0.375rem 0 0;
  font-size: 0.875rem;
  color: var(--muted);
  font-weight: 500;
  line-height: 1.35;
}

/* Small keyboard hint */
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0.125rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;

  background: var(--surface-2);
  color: var(--text);

  font-weight: 600;
  font-size: 0.8125rem;
  line-height: 1.2;
}

/* Status pill (quiet) */
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
}

.pill__dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 999rem;
  background: var(--accent);
}

.pill[data-tone="good"] .pill__dot {
  background: color-mix(in srgb, var(--accent) 55%, #22c55e 45%);
}

.pill__text {
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.01em;
}

/* Input section */
.add__input {
  padding: var(--pad-lg);
}

/* Textarea — GNOME style: surface + focus ring */
.textarea {
  min-inline-size: 0;
  inline-size: 100%;
  resize: vertical;
  min-block-size: 6.25rem;

  padding: 0.875rem 1rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 0.9);

  background: var(--surface-2);
  color: var(--text);

  font: inherit;
  font-weight: 500;
  line-height: 1.4;

  outline: none;
  transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;

  box-sizing: border-box;
}

.textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 85%, transparent);
  font-weight: 450;
}

.textarea:focus {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: 0 0 0 0.2rem var(--ring);
  background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
}

/* Error — calm but clear */
.error {
  margin: 0.75rem 0 0;
  padding: 0.75rem 1rem;

  border: 1px solid var(--danger-border);
  border-radius: calc(var(--radius) * 0.9);

  background: var(--danger-bg);
  color: var(--text);

  font-weight: 600;
  line-height: 1.35;
}

/* Controls row */
.add__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  padding: 0.75rem 1.25rem 1.25rem;
  border-top: 1px solid transparent; /* keeps spacing consistent in some layouts */
}

.add__clip {
  border-radius: calc(var(--radius) * 0.9);
  overflow: clip;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: end;
}

/* Field */
.field {
  display: grid;
  gap: 0.375rem;
}

.field__label {
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Select — quiet, readable, proper focus */
.select {
  appearance: none;
  inline-size: max-content;

  padding: 0.625rem 2.25rem 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 0.9);

  background: var(--surface-2);
  color: var(--text);

  font: inherit;
  font-weight: 550;

  outline: none;
  transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
}

/* simple caret */
.select {
  background-image:
      linear-gradient(45deg, transparent 50%, var(--text) 50%),
      linear-gradient(135deg, var(--text) 50%, transparent 50%);
  background-position:
      calc(100% - 1.15rem) 55%,
      calc(100% - 0.85rem) 55%;
  background-size:
      0.4rem 0.4rem,
      0.4rem 0.4rem;
  background-repeat: no-repeat;
}

.select:focus {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: 0 0 0 0.2rem var(--ring);
  background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
}

/* Checkbox row — let the platform handle most visuals */
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;

  font-weight: 550;
  color: var(--text);
  user-select: none;
}

.check__box {
  inline-size: 1.1rem;
  block-size: 1.1rem;
  margin: 0;
  accent-color: var(--accent);
}

.check__text {
  font-size: 0.875rem;
}

/* Primary button — GNOME-ish: calm fill, subtle hover */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;

  padding: 0.75rem 1rem;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, var(--border));
  border-radius: calc(var(--radius) * 0.9);

  background: color-mix(in srgb, var(--accent) 20%, var(--surface));
  color: var(--text);

  font-weight: 650;
  letter-spacing: 0.01em;

  cursor: pointer;
  transition:
      background 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      transform 120ms ease;
  flex: 0 0 auto;
}

.btn__icon {
  inline-size: 1.5rem;
  block-size: 1.5rem;
  display: grid;
  place-items: center;

  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--surface) 82%, var(--text) 18%);
  color: var(--text);

  font-weight: 700;
  font-size: 0.95em;
}

.btn:hover {
  background: color-mix(in srgb, var(--accent) 26%, var(--surface));
}

.btn:active {
  transform: translateY(0.06rem);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 0.2rem var(--ring);
}

/* Responsive: stack controls on narrow widths */
@media (max-width: 45rem) {
  .add__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    inline-size: 100%;
    justify-content: center;
  }

  .select {
    inline-size: 100%;
  }
}

.inputTip {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted);
}
.inputTip kbd {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--surface) 85%, var(--text) 15%);
  font-size: 0.75rem;
  font-weight: 650;
}
</style>
