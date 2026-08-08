<script lang="ts">
  import { Download, Check } from "@lucide/svelte";
  import Avatar from "./Avatar.svelte";
  import Spinner from "./Spinner.svelte";

  // `status` drives the trailing icon so the central download action gets a
  // payoff: download → spinner → a brief success check → back to download.
  let {
    name = "",
    instrument = "",
    status = "idle",
    onclick,
  }: {
    name?: string | null;
    instrument?: string;
    status?: "idle" | "loading" | "done";
    onclick?: (e: MouseEvent) => void;
  } = $props();
</script>

<button type="button" class="tile" class:done={status === "done"} {onclick}>
  <Avatar src={instrument} alt={name ?? ""} size={52} />
  <span class="name">{name}</span>
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
  .name {
    flex: 1;
    font-family: var(--font-text);
    font-weight: 500;
    font-size: 16px;
    color: var(--white);
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
