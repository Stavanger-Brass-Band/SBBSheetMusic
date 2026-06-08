<script lang="ts">
  let {
    src = "",
    alt = "",
    size = 48,
    ring = false,
  }: { src?: string; alt?: string; size?: number; ring?: boolean } = $props();
</script>

<span
  class="avatar"
  class:ring
  style="width:{size}px; height:{size}px; font-size:{size * 0.4}px;"
>
  {#if src}
    <img {src} {alt} />
  {:else}
    <span class="initial">{alt.slice(0, 1).toUpperCase()}</span>
  {/if}
</span>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: var(--white);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    flex-shrink: 0;
  }
  .avatar.ring {
    border: 2px solid var(--accent);
  }
  img {
    max-width: 78%;
    max-height: 78%;
    object-fit: contain;
  }
  .initial {
    font-family: var(--font-display);
    font-weight: 600;
    color: var(--text-secondary);
  }
</style>
