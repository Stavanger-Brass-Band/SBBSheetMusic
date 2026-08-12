<script lang="ts">
  import { Download, Check } from "@lucide/svelte";
  import Avatar from "./Avatar.svelte";
  import Spinner from "./Spinner.svelte";

  // `status` drives the trailing icon so the central download action gets a
  // payoff: download → spinner → a brief success check → back to download.
  // `mine` marks a part the signed-in user plays, so their own sheets stand out
  // in a grid of thirty.
  let {
    name = "",
    instrument = "",
    status = "idle",
    mine = false,
    onclick,
  }: {
    name?: string | null;
    instrument?: string;
    status?: "idle" | "loading" | "done";
    mine?: boolean;
    onclick?: (e: MouseEvent) => void;
  } = $props();
</script>

<button
  type="button"
  class="tile"
  class:done={status === "done"}
  class:mine
  {onclick}
>
  <Avatar src={instrument} alt={name ?? ""} size={52} />
  <span class="text">
    <span class="name">{name}</span>
    {#if mine}
      <span class="mine-tag">Min stemme</span>
    {/if}
  </span>
  <span class="action">
    {#if status === "loading"}
      <Spinner size={18} inline />
    {:else if status === "done"}
      <Check size={20} />
    {:else}
      <Download size={20} />
    {/if}
  </span>
</button>

<style>
  .tile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 10px 16px 10px 10px;
    text-align: left;
    background: var(--ink-800);
    border: 1px solid var(--border-inverse);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: background var(--dur-fast);
  }
  .tile:hover {
    background: var(--ink-700);
  }
  /* `min-width: 0` is what lets a long part name shrink and ellipsise instead of
     pushing the download icon out past the tile's edge — the grid gives each tile
     as little as 260px. */
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .name {
    max-width: 100%;
    font-family: var(--font-text);
    font-weight: 500;
    font-size: 16px;
    color: var(--white);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* The user's own part: a brass edge, plus a caption so the distinction doesn't
     rest on colour alone. It sits under the name rather than beside it — the tile
     has vertical room to spare, and horizontally it would compete with the name
     for the little the grid allows. */
  .tile.mine {
    border-color: var(--brass-500);
    background: color-mix(in srgb, var(--brass-500) 12%, var(--ink-800));
  }
  .tile.mine:hover {
    background: color-mix(in srgb, var(--brass-500) 20%, var(--ink-800));
  }
  .mine-tag {
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 10.5px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--brass-500);
  }
  .action {
    display: inline-flex;
    color: var(--gray-400);
    transition: color var(--dur-fast);
  }
  .tile:hover .action {
    color: var(--brass-500);
  }
  /* Success: the check reads green and pops in, then the parent flips back to
     idle after a moment. */
  .tile.done .action {
    color: var(--success);
    animation: tile-check-pop var(--dur-base) var(--ease-out);
  }
  .tile.done:hover .action {
    color: var(--success);
  }
  @keyframes tile-check-pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
