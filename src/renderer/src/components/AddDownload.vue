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
</script>

<template>
    <section class="add">
        <div class="add__top">
            <div>
                <h2 class="add__title">Add download</h2>
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
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.add {
    background: var(--card);
    border: 3px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
    overflow: hidden;
}

.add__top {
    display: flex;
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

.add__title {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.01em;
}

.add__hint {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

.kbd {
    display: inline-block;
    padding: 2px 6px;
    border: 2px solid var(--border);
    border-radius: 8px;
    background: #fff;
    box-shadow: 3px 3px 0 var(--ink);
    font-weight: 900;
    font-size: 11px;
    line-height: 1.2;
    margin-right: 2px;
}

/* pill */
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

/* Input */
.add__input {
    padding: 14px 16px 10px;
}

.textarea {
    width: 100%;
    resize: vertical;
    min-height: 86px;

    padding: 12px 12px;
    border: 3px solid var(--border);
    border-radius: 14px;
    background: #fff;
    color: var(--ink);

    font: inherit;
    font-weight: 650;
    line-height: 1.35;

    box-shadow: 6px 6px 0 var(--ink);
    outline: none;
}

.textarea::placeholder {
    color: #5a5a5a;
    font-weight: 650;
}

.textarea:focus {
    transform: translate(-1px, -1px);
    box-shadow: 8px 8px 0 var(--ink);
}

.error {
    margin: 10px 0 0;
    padding: 10px 12px;
    border: 3px solid var(--border);
    border-radius: 14px;
    background: var(--guava-soft);
    box-shadow: 6px 6px 0 var(--ink);
    font-weight: 800;
}

/* Controls row */
.add__controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px 16px;
}

.controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    align-items: center;
}

/* Format field */
.field {
    display: grid;
    gap: 6px;
    margin-right: 4px;
}

.field__label {
    font-size: 12px;
    font-weight: 900;
    color: var(--muted);
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.select {
    appearance: none;
    padding: 10px 34px 10px 12px;
    border: 3px solid var(--border);
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-weight: 800;
    box-shadow: 6px 6px 0 var(--ink);
    outline: none;
    position: relative;
}

/* simple caret */
.select {
    background-image:
        linear-gradient(45deg, transparent 50%, var(--ink) 50%),
        linear-gradient(135deg, var(--ink) 50%, transparent 50%),
        linear-gradient(to right, transparent, transparent);
    background-position:
        calc(100% - 18px) 55%,
        calc(100% - 12px) 55%,
        0 0;
    background-size:
        6px 6px,
        6px 6px,
        100% 100%;
    background-repeat: no-repeat;
}

.select:focus {
    transform: translate(-1px, -1px);
    box-shadow: 8px 8px 0 var(--ink);
}

/* Checkboxes */
.check {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    color: var(--ink);
    user-select: none;
}

.check__box {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--leaf);
}

.check__text {
    font-size: 13px;
    font-weight: 800;
}

/* Button */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 12px 14px;
    border: 3px solid var(--border);
    border-radius: 14px;

    background: linear-gradient(0deg, var(--guava), var(--guava));
    color: #111;

    font-weight: 950;
    letter-spacing: -0.01em;
    cursor: pointer;

    box-shadow: 7px 7px 0 var(--ink);
    transition:
        transform 120ms ease,
        box-shadow 120ms ease;
    flex: 0 0 auto;
}

.btn__icon {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;

    border: 2px solid var(--border);
    border-radius: 10px;
    background: #fff;
    box-shadow: 3px 3px 0 var(--ink);
    font-weight: 1000;
}

.btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 9px 9px 0 var(--ink);
}

.btn:active {
    transform: translate(2px, 2px);
    box-shadow: 4px 4px 0 var(--ink);
}

@media (max-width: 720px) {
    .add__controls {
        flex-direction: column;
        align-items: stretch;
    }

    .btn {
        width: 100%;
        justify-content: center;
    }
}
</style>
