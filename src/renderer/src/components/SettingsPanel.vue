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

/* GNOME-ish dark-only Settings
   - Flat surfaces, subtle separators, calm focus rings
   - Responsive units (rem/em/vw/vh); 1px borders are the only px exception
   - Assumes dark tokens: --bg --surface --text --muted --accent --border --radius
*/

.settings {
    --pad: 1.25rem;
    --pad-sm: 1rem;

    --surface-2: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
    --surface-3: color-mix(in srgb, var(--surface) 86%, var(--text) 14%);
    --ring: color-mix(in srgb, var(--accent) 55%, transparent);

    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: clip;
}

/* Header */
.settings__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    padding: var(--pad-sm) var(--pad);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
}

.settings__title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 650;
    letter-spacing: 0.01em;
    color: var(--text);
}

.settings__hint {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--muted);
    font-weight: 500;
    line-height: 1.35;
}

.settings__body {
    padding: var(--pad-sm) var(--pad);
    display: grid;
    gap: 1rem;
}

/* Optional status pill (quiet) */
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

.pill__text {
    font-weight: 650;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
}

/* Fields */
.field {
    display: grid;
    gap: 0.5rem;
}

.field__label {
    font-size: 0.75rem;
    font-weight: 650;
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.field__row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
}

/* Inputs */
.input {
    flex: 1 1 15rem;
    padding: 0.75rem 0.875rem;

    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);

    background: var(--surface-2);
    color: var(--text);

    font: inherit;
    font-weight: 500;

    outline: none;
    min-width: 0;

    transition:
        border-color 120ms ease,
        box-shadow 120ms ease,
        background 120ms ease;
}

.input::placeholder {
    color: color-mix(in srgb, var(--muted) 85%, transparent);
    font-weight: 450;
}

.input:focus {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    box-shadow: 0 0 0 0.2rem var(--ring);
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
}

/* Select */
.select {
    inline-size: 100%;
    appearance: none;

    padding: 0.75rem 2.5rem 0.75rem 0.875rem;

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

    /* caret */
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

/* Toggles group */
.toggles {
    display: grid;
    gap: 0.625rem;

    padding: 0.875rem 1rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);

    background: var(--surface-2);
}

/* Checkbox row */
.check {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;

    font-weight: 500;
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
    font-weight: 500;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;

    padding: 0.75rem 0.875rem;
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

.btn--soft {
    background: var(--surface-3);
}

.btn--guava {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.btn--full {
    inline-size: 100%;
}

/* Icon in button (subtle) */
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

/* Mobile */
@media (max-width: 45rem) {
    .field__row {
        flex-direction: column;
        align-items: stretch;
    }

    .btn {
        inline-size: 100%;
    }
}
</style>
