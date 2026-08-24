<script lang="ts">
  import { browser } from "$app/environment";
  import { Search } from "@lucide/svelte";
  import { shortcutLabel } from "$lib/utils/platform";

  /**
   * The way into Quick jump for anyone not reaching for the keyboard.
   *
   * The shortcut alone wouldn't do: there is no ⌘K on a phone or a tablet, so
   * without a button the palette simply wouldn't exist for the readers who use
   * the app on one. The header renders this in two places — one at a time, since
   * the collapsed layout has no nav row to put it in — hence `compact`, which
   * drops the shortcut hint and matches the hamburger's square.
   */
  let {
    compact = false,
    onclick,
  }: {
    compact?: boolean;
    onclick: () => void;
  } = $props();

  /**
   * The modifier this reader's keyboard actually has — `⌘K` or `Ctrl+K`. Both are
   * listened for (see `QuickJump`), so this only decides which one to name.
   * Server-side there is no keyboard to name, and Ctrl is the safer default.
   */
  const shortcut = browser ? shortcutLabel("K", navigator.userAgent) : "Ctrl+K";
</script>

<button
  type="button"
  class="trigger"
  class:compact
  aria-label={`Søk (${shortcut})`}
  title={`Søk (${shortcut})`}
  {onclick}
>
  <Search size={compact ? 20 : 16} />
  {#if !compact}
    <!-- Not a live shortcut display, so `kbd` is the honest element: it names
         the key the reader would press instead of this button. -->
    <kbd>{shortcut}</kbd>
  {/if}
</button>

<style>
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 36px;
    padding: 0 11px;
    color: var(--gray-400);
    background: transparent;
    border: 1px solid var(--border-inverse);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-text);
    flex-shrink: 0;
    transition:
      color var(--dur-fast),
      background var(--dur-fast),
      border-color var(--dur-fast);
  }
  .trigger:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--border-strong);
  }
  .trigger:focus-visible {
    outline: 2px solid var(--brass-500);
    outline-offset: 2px;
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--gray-500);
    background: transparent;
    border: 0;
    padding: 0;
    white-space: nowrap;
  }
  .trigger:hover kbd {
    color: var(--gray-300);
  }

  /* The collapsed header's square, sized to sit beside the hamburger. */
  .trigger.compact {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
    border-radius: var(--radius-sm);
  }
</style>
