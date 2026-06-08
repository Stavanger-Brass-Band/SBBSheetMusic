<script lang="ts">
  let {
    size = 28,
    label = "",
    inline = false,
  }: { size?: number; label?: string; inline?: boolean } = $props();

  let border = $derived(Math.max(2, size / 12));
</script>

{#if inline}
  <span
    class="ring"
    style="--sz:{size}px; --bw:{border}px; --track:rgba(255,255,255,0.4); --top:currentColor;"
  ></span>
{:else}
  <span class="wrap">
    <span
      class="ring"
      style="--sz:{size}px; --bw:{border}px; --track:var(--border-subtle); --top:var(--accent);"
    ></span>
    {#if label}<span class="label">{label}</span>{/if}
  </span>
{/if}

<style>
  .ring {
    width: var(--sz);
    height: var(--sz);
    border-radius: 50%;
    border: var(--bw) solid var(--track);
    border-top-color: var(--top);
    display: inline-block;
    animation: sbb-spin 0.7s linear infinite;
  }
  .wrap {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .label {
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--text-secondary);
  }
</style>
