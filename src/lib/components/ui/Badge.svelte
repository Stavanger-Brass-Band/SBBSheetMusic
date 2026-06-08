<script lang="ts">
  import type { Snippet } from "svelte";

  type Variant =
    | "neutral"
    | "accent"
    | "solid"
    | "success"
    | "danger"
    | "info"
    | "outline";

  let {
    variant = "neutral",
    dot = false,
    children,
  }: { variant?: Variant; dot?: boolean; children?: Snippet } = $props();
</script>

<span class="badge {variant}">
  {#if dot}<span class="dot"></span>{/if}
  {@render children?.()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 22px;
    padding: 0 10px;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .neutral {
    background: var(--surface-sunken);
    color: var(--text-secondary);
    border-color: var(--border-subtle);
  }
  .accent {
    background: var(--accent-soft);
    color: var(--brass-300);
  }
  .solid {
    background: var(--accent);
    color: var(--accent-on);
  }
  .success {
    background: var(--success-soft);
    color: var(--success);
  }
  .danger {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .info {
    background: var(--info-soft);
    color: var(--info);
  }
  .outline {
    background: transparent;
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
</style>
