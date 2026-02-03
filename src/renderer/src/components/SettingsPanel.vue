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
    <section style="border: 1px solid #ddd; border-radius: 12px; padding: 12px">
        <h2 style="margin: 0 0 10px 0; font-size: 16px">Settings</h2>

        <label style="display: block; font-size: 12px; opacity: 0.7"
            >Output folder</label
        >
        <div style="display: flex; gap: 8px; margin-top: 6px">
            <input
                v-model="draft.outputDir"
                style="
                    flex: 1;
                    padding: 8px;
                    border-radius: 10px;
                    border: 1px solid #ccc;
                "
            />
            <button
                @click="pickFolder"
                style="
                    padding: 8px 10px;
                    border-radius: 10px;
                    border: 1px solid #ccc;
                    cursor: pointer;
                "
            >
                Browse
            </button>
        </div>

        <div style="margin-top: 10px">
            <label style="display: block; font-size: 12px; opacity: 0.7"
                >Default format</label
            >
            <select
                v-model="draft.audioFormat"
                style="
                    width: 100%;
                    padding: 8px;
                    border-radius: 10px;
                    border: 1px solid #ccc;
                    margin-top: 6px;
                "
            >
                <option value="mp3">MP3</option>
                <option value="opus">OPUS</option>
                <option value="flac">FLAC</option>
            </select>
        </div>

        <div style="display: grid; gap: 8px; margin-top: 10px">
            <label style="display: flex; gap: 8px; align-items: center">
                <input type="checkbox" v-model="draft.embedMetadata" />
                Embed metadata
            </label>
            <label style="display: flex; gap: 8px; align-items: center">
                <input type="checkbox" v-model="draft.embedThumbnail" />
                Embed thumbnail
            </label>
            <label style="display: flex; gap: 8px; align-items: center">
                <input type="checkbox" v-model="draft.allowPlaylists" />
                Allow playlists
            </label>
        </div>

        <button
            @click="save"
            style="
                margin-top: 12px;
                width: 100%;
                padding: 10px 12px;
                border-radius: 10px;
                border: 1px solid #333;
                background: #111;
                color: #fff;
                cursor: pointer;
            "
        >
            Save settings
        </button>
    </section>
</template>
