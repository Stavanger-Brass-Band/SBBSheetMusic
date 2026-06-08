<script lang="ts">
  import { Download } from "@lucide/svelte";
  import Avatar from "./Avatar.svelte";
  import Spinner from "./Spinner.svelte";

  let {
    name = "",
    instrument = "",
    loading = false,
    onclick,
  }: {
    name?: string | null;
    instrument?: string;
    loading?: boolean;
    onclick?: (e: MouseEvent) => void;
  } = $props();
</script>

<button type="button" class="tile" {onclick}>
  <Avatar src={instrument} alt={name ?? ""} size={52} />
  <span class="name">{name}</span>
  <span class="action">
    {#if loading}
      <Spinner size={18} inline />
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
</style>
