<script lang="ts">
  import { Eye } from "@lucide/svelte";
  import Avatar from "./Avatar.svelte";

  let {
    name = "",
    instrument = "",
    onclick,
  }: {
    name?: string | null;
    instrument?: string;
    onclick?: (e: MouseEvent) => void;
  } = $props();
</script>

<button type="button" class="tile" {onclick}>
  <Avatar src={instrument} alt={name ?? ""} size={52} />
  <span class="name">{name}</span>
  <span class="action">
    <Eye size={20} />
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
