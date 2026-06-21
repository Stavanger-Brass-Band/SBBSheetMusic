<script lang="ts">
  import type { Snippet } from "svelte";

  // Shared friendly empty/zero-state: an optional icon in a soft disc, a title,
  // and an optional description line. Used wherever a list has nothing to show
  // so dead-ends read as composed rather than like missing data.
  let {
    title,
    description = "",
    icon,
  }: {
    title: string;
    description?: string;
    icon?: Snippet;
  } = $props();
</script>

<div class="empty-state">
  {#if icon}<span class="empty-state__icon">{@render icon()}</span>{/if}
  <p class="empty-state__title">{title}</p>
  {#if description}<p class="empty-state__desc">{description}</p>{/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 56px 24px;
  }
  .empty-state__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    color: var(--text-secondary);
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    margin-bottom: 4px;
  }
  .empty-state__title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 18px;
    color: var(--text-primary);
  }
  .empty-state__desc {
    margin: 0;
    max-width: 420px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-muted);
  }
</style>
