<script setup lang="ts">
import { ref } from "vue";
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

    if (urls.length === 0) return;

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

    // nice QoL: clear input after adding
    url.value = "";
}
</script>

<template>
    <section style="border: 1px solid #ddd; border-radius: 12px; padding: 12px">
        <h2 style="margin: 0 0 10px 0; font-size: 16px">Add download</h2>

        <textarea
            v-model="url"
            placeholder="Paste a YouTube URL…"
            rows="2"
            style="
                width: 100%;
                padding: 10px;
                border-radius: 10px;
                border: 1px solid #ccc;
                resize: vertical;
            "
        />

        <div
            style="
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-top: 10px;
                align-items: center;
            "
        >
            <label style="display: flex; gap: 6px; align-items: center">
                Format
                <select
                    v-model="format"
                    style="padding: 6px; border-radius: 8px"
                >
                    <option value="mp3">MP3</option>
                    <option value="opus">OPUS</option>
                    <option value="flac">FLAC</option>
                </select>
            </label>

            <label style="display: flex; gap: 6px; align-items: center">
                <input type="checkbox" v-model="embedMetadata" />
                Embed metadata
            </label>

            <label style="display: flex; gap: 6px; align-items: center">
                <input type="checkbox" v-model="embedThumbnail" />
                Embed thumbnail
            </label>

            <label style="display: flex; gap: 6px; align-items: center">
                <input type="checkbox" v-model="allowPlaylists" />
                Allow playlists
            </label>

            <button
                @click="add"
                style="
                    margin-left: auto;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: 1px solid #333;
                    background: #111;
                    color: #fff;
                    cursor: pointer;
                "
            >
                Add to queue
            </button>
        </div>
    </section>
</template>
