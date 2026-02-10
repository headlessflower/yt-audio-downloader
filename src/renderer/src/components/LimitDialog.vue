<script setup lang="ts">
defineProps<{
    open: boolean;
    limit: number;
    current: number;
    message?: string;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "upgrade"): void;
}>();
</script>

<template>
    <div
        v-if="open"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-title"
    >
        <div class="dialog__backdrop" @click="emit('close')" />

        <div class="dialog__panel">
            <header class="dialog__header">
                <h2 id="limit-title" class="dialog__title">
                    Queue limit reached
                </h2>
            </header>

            <div class="dialog__body">
                <p class="dialog__text">
                    {{
                        message ||
                        `You can add up to ${limit} URLs on the Free plan.`
                    }}
                </p>

                <p class="dialog__meta">
                    Currently in queue: <strong>{{ current }}</strong>
                </p>
            </div>

            <footer class="dialog__actions">
                <button class="btn btn--soft" @click="emit('close')">OK</button>
                <button class="btn btn--accent" @click="emit('upgrade')">
                    Upgrade
                </button>
            </footer>
        </div>
    </div>
</template>

<style scoped>
.dialog {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
}

.dialog__backdrop {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, #000 60%, transparent);
}

.dialog__panel {
    position: relative;
    inline-size: min(30rem, 92vw);
    background: var(--surface);
    color: var(--text);

    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: clip;
}

.dialog__header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
}

.dialog__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
    letter-spacing: 0.01em;
}

.dialog__body {
    padding: 1rem 1.25rem;
    display: grid;
    gap: 0.5rem;
}

.dialog__text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--muted);
    line-height: 1.35;
}

.dialog__meta {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text);
}

.dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--border);
}

/* Buttons (reuse your GNOME-ish style) */
.btn {
    padding: 0.625rem 0.875rem;
    border-radius: calc(var(--radius) * 0.9);
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 86%, var(--text) 14%);
    color: var(--text);
    font-size: 0.875rem;
    font-weight: 650;
    cursor: pointer;
}

.btn:hover {
    background: color-mix(in srgb, var(--surface) 80%, var(--text) 20%);
}

.btn--soft {
    background: color-mix(in srgb, var(--surface) 86%, var(--text) 14%);
}

.btn--accent {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--accent) 55%, transparent);
}
</style>
