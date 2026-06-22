<script lang="ts">
  import { Search } from "@lucide/svelte";
  import Spinner from "./Spinner.svelte";

  // Shared search field: the leading icon swaps to an inline spinner while a
  // (server-side) search is in flight. For client-side filtering just bind
  // `value` and leave `searching` false.
  let {
    value = $bindable(""),
    placeholder = "Søk…",
    searching = false,
    oninput,
  }: {
    value?: string;
    placeholder?: string;
    searching?: boolean;
    oninput?: (e: Event) => void;
  } = $props();
</script>

<div class="search">
  <span class="search-icon">
    {#if searching}
      <Spinner size={18} inline />
    {:else}
      <Search size={18} />
    {/if}
  </span>
  <input type="text" {placeholder} bind:value {oninput} />
</div>

<style>
  .search {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  .search-icon {
    position: absolute;
    left: 16px;
    color: var(--text-muted);
    display: flex;
  }
  .search input {
    width: 100%;
    height: 48px;
    padding: 0 16px 0 46px;
    font-family: var(--font-text);
    font-size: 15px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .search input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(234, 91, 12, 0.18);
  }
</style>
