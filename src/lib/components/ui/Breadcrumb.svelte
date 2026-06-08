<script lang="ts">
  type Item = { label: string; href?: string };
  let {
    items = [],
    class: className = "",
  }: { items?: Item[]; class?: string } = $props();
</script>

<nav class="crumbs {className}">
  {#each items as item, i}
    <span class="seg">
      {#if i === items.length - 1 || !item.href}
        <span class="cur" class:last={i === items.length - 1}>{item.label}</span
        >
      {:else}
        <a href={item.href}>{item.label}</a>
      {/if}
      {#if i < items.length - 1}<span class="sep">/</span>{/if}
    </span>
  {/each}
</nav>

<style>
  .crumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .seg {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  a,
  .cur {
    font-family: var(--font-text);
    font-size: 13px;
    text-decoration: none;
  }
  a {
    color: var(--accent);
  }
  a:hover {
    color: var(--accent-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .cur {
    color: var(--text-secondary);
  }
  .cur.last {
    font-weight: 600;
    color: var(--text-primary);
  }
  .sep {
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
