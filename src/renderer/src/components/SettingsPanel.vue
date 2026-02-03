<script setup lang="ts">
import { ref, watch } from "vue";
import type { Settings } from "../types";

const props = defineProps<{ settings: Settings }>();
const emit = defineEmits<{ (e: "save", next: Settings): void }>();

const draft = ref<Settings>({ ...props.settings });

watch(
    () => props.settings,
    (s) => (draft.value = { ...s }),
    { deep: true },
);

async function pickFolder() {
    const p = await window.api.settings.pickFolder();
    if (p) draft.value.outputDir = p;
}

function save() {
    emit("save", { ...draft.value });
}
</script>

<template>
    <section class="settings">
        <header class="settings__header">
            <div>
                <h2 class="settings__title">Settings</h2>
                <p class="settings__hint">Defaults for new downloads.</p>
            </div>

            <span class="pill" data-tone="neutral">
                <span class="pill__dot" aria-hidden="true" />
                <span class="pill__text">Defaults</span>
            </span>
        </header>

        <div class="settings__body">
            <!-- Output folder -->
            <div class="field">
                <label class="field__label" for="outdir">Output folder</label>
                <div class="field__row">
                    <input
                        id="outdir"
                        v-model="draft.outputDir"
                        class="input"
                        type="text"
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <button
                        class="btn btn--soft"
                        type="button"
                        @click="pickFolder"
                    >
                        Browse
                    </button>
                </div>
            </div>

            <!-- Default format -->
            <div class="field">
                <label class="field__label" for="format">Default format</label>
                <select id="format" v-model="draft.audioFormat" class="select">
                    <option value="mp3">MP3</option>
                    <option value="opus">OPUS</option>
                    <option value="flac">FLAC</option>
                </select>
            </div>

            <!-- Toggles -->
            <div class="toggles">
                <label class="check">
                    <input
                        class="check__box"
                        type="checkbox"
                        v-model="draft.embedMetadata"
                    />
                    <span class="check__text">Embed metadata</span>
                </label>

                <label class="check">
                    <input
                        class="check__box"
                        type="checkbox"
                        v-model="draft.embedThumbnail"
                    />
                    <span class="check__text">Embed thumbnail</span>
                </label>

                <label class="check">
                    <input
                        class="check__box"
                        type="checkbox"
                        v-model="draft.allowPlaylists"
                    />
                    <span class="check__text">Allow playlists</span>
                </label>
            </div>

            <!-- Save -->
            <button
                class="btn btn--guava btn--full"
                type="button"
                @click="save"
            >
                <span class="btn__icon" aria-hidden="true">✓</span>
                Save settings
            </button>
        </div>
    </section>
</template>

<style scoped>
/* Assumes your CSS variables live globally (theme.css) */

.settings {
    background: var(--card);
    border: 3px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-x) var(--shadow-y) 0 var(--ink);
    overflow: hidden;
}

/* Header */
.settings__header {
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

.settings__title {
    margin: 0;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -0.01em;
}

.settings__hint {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
}

.settings__body {
    padding: 14px 16px 16px;
    display: grid;
    gap: 14px;
}

/* Pill (same as other components) */
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

.pill__text {
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 0.02em;
}

/* Fields */
.field {
    display: grid;
    gap: 8px;
}

.field__label {
    font-size: 12px;
    font-weight: 950;
    color: var(--muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.field__row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.input {
    flex: 1 1 240px;
    padding: 12px 12px;

    border: 3px solid var(--border);
    border-radius: 14px;

    background: #fff;
    color: var(--ink);

    font: inherit;
    font-weight: 750;

    box-shadow: 6px 6px 0 var(--ink);
    outline: none;
    min-width: 0;
}

.input:focus {
    transform: translate(-1px, -1px);
    box-shadow: 8px 8px 0 var(--ink);
}

/* Select */
.select {
    width: 100%;
    appearance: none;

    padding: 12px 38px 12px 12px;

    border: 3px solid var(--border);
    border-radius: 14px;

    background: #fff;
    color: var(--ink);

    font: inherit;
    font-weight: 850;

    box-shadow: 6px 6px 0 var(--ink);
    outline: none;

    /* caret */
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

/* Toggles */
.toggles {
    display: grid;
    gap: 10px;
    padding: 12px 12px;
    border: 3px solid var(--border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 6px 6px 0 var(--ink);
}

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
    font-weight: 850;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    padding: 12px 14px;
    border: 3px solid var(--border);
    border-radius: 14px;

    background: #fff;
    color: var(--ink);

    font-weight: 950;
    cursor: pointer;

    box-shadow: 7px 7px 0 var(--ink);
    transition:
        transform 120ms ease,
        box-shadow 120ms ease;
}

.btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 9px 9px 0 var(--ink);
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

.btn--full {
    width: 100%;
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

@media (max-width: 720px) {
    .field__row {
        flex-direction: column;
        align-items: stretch;
    }

    .btn {
        width: 100%;
    }
}
</style>
