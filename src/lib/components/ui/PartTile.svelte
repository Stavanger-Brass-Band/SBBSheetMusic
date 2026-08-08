<script lang="ts">
  import { Eye, Download, Check } from "@lucide/svelte";
  import Avatar from "./Avatar.svelte";
  import Spinner from "./Spinner.svelte";

  // Viewing (opening the part in a new browser tab) is the primary, whole-tile
  // action. Downloading is a secondary, small icon: a forced save under a
  // proper "{set} - {part}.pdf" name, for people who specifically want a local
  // file rather than just reading or sharing it. Each action gets its own
  // idle → loading → done cycle since they're independent. The trailing icon
  // on the main button only earns its place when there's a second action to
  // tell it apart from — a tile with just one action needs no icon hinting at
  // what tapping it does.
  let {
    name = "",
    instrument = "",
    status = "idle",
    downloadStatus = "idle",
    onclick,
    onDownload,
  }: {
    name?: string | null;
    instrument?: string;
    status?: "idle" | "loading" | "done";
    downloadStatus?: "idle" | "loading" | "done";
    onclick?: (e: MouseEvent) => void;
    onDownload?: (e: MouseEvent) => void;
  } = $props();
</script>

<div class="tile" class:done={status === "done"}>
  <button type="button" class="tile-main" {onclick}>
    <Avatar src={instrument} alt={name ?? ""} size={52} />
    <span class="name">{name}</span>
    {#if onDownload}
      <span class="action">
        {#if status === "loading"}
          <Spinner size={18} inline />
        {:else if status === "done"}
          <Check size={20} />
        {:else}
          <Eye size={20} />
        {/if}
      </span>
    {/if}
  </button>
  {#if onDownload}
    <button
      type="button"
      class="download-action"
      class:done={downloadStatus === "done"}
      onclick={onDownload}
      title="Last ned"
      aria-label="Last ned {name}"
    >
      {#if downloadStatus === "loading"}
        <Spinner size={16} inline />
      {:else if downloadStatus === "done"}
        <Check size={16} />
      {:else}
        <Download size={16} />
      {/if}
    </button>
  {/if}
</div>

<style>
  .tile {
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    background: var(--ink-800);
    border: 1px solid var(--border-inverse);
    border-radius: var(--radius-lg);
    transition: background var(--dur-fast);
  }
  .tile:hover {
    background: var(--ink-700);
  }
  .tile-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
    padding: 10px 10px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
  }
  .name {
    flex: 1;
    min-width: 0;
    font-family: var(--font-text);
    font-weight: 500;
    font-size: 16px;
    color: var(--white);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  .download-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    margin: 8px 8px 8px 0;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--gray-400);
    cursor: pointer;
    transition: color var(--dur-fast);
  }
  .download-action:hover {
    color: var(--brass-500);
  }
  .download-action.done {
    color: var(--success);
    animation: tile-check-pop var(--dur-base) var(--ease-out);
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
