<script setup lang="ts">
defineProps<{ disabled?: boolean }>();

function clearFinished() {
    // Use globalThis to avoid template/global lookup issues
    const w = globalThis as unknown as Window;

    if (!w.api?.queue?.clearFinished) {
        console.error(
            "window.api.queue.clearFinished is missing — preload or IPC not wired.",
        );
        return;
    }

    w.api.queue.clearFinished();
}
</script>

<template>
    <button class="clear" :disabled="disabled" @click="clearFinished">
        Clear finished
    </button>
</template>

<style scoped>
.clear {
    appearance: none;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) * 0.9);
    padding: 0.5rem 0.75rem;

    background: color-mix(in srgb, var(--surface) 86%, var(--text) 14%);
    color: var(--text);

    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;

    cursor: pointer;
    transition:
        background 120ms ease,
        opacity 120ms ease;
}

.clear:hover {
    background: color-mix(in srgb, var(--surface) 80%, var(--text) 20%);
}

.clear:disabled {
    opacity: 0.45;
    cursor: default;
}
</style>
