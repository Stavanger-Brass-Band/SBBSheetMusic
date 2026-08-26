<script lang="ts">
  import type { Snippet } from "svelte";
  import Spinner from "./Spinner.svelte";
  import Loader from "./Loader.svelte";

  type Variant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
  type Size = "sm" | "md" | "lg";

  let {
    variant = "primary",
    size = "md",
    block = false,
    iconOnly = false,
    disabled = false,
    loading = false,
    type = "button",
    onclick,
    element = $bindable(),
    class: className = "",
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    block?: boolean;
    /**
     * Square, for a button whose whole label is its icon. Such a button has no
     * text to name it, so give it an `aria-label` and a `title` — one for a
     * screen reader, the other for a pointer that has to hover to find out.
     */
    iconOnly?: boolean;
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    onclick?: (e: MouseEvent) => void;
    /**
     * The rendered button, for a caller that has to move focus to it — `bind:this`
     * on a component hands back the component, not the element.
     */
    element?: HTMLButtonElement;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  // The brass loading marks disappear into a brass or red fill, so the filled
  // variants keep the ring — which takes its colour from the button's own text.
  // The variants that sit on a dark surface can carry a mark, and get the notes.
  let filled = $derived(variant === "primary" || variant === "danger");
</script>

<button
  bind:this={element}
  {type}
  class="btn {variant} {size} {className}"
  class:block
  class:icon-only={iconOnly}
  disabled={disabled || loading}
  {onclick}
  {...rest}
>
  {#if loading}
    {#if filled}
      <Spinner size={15} inline />
    {:else}
      <Loader variant="notes" size="sm" />
    {/if}
  {/if}
  {@render children?.()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: var(--font-text);
    font-weight: 600;
    line-height: 1;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.block {
    display: flex;
    width: 100%;
  }
  /* The size classes below set the height; the ratio makes the width follow it,
     so one rule squares off all three. */
  .btn.icon-only {
    padding: 0;
    aspect-ratio: 1;
  }

  /* sizes */
  .sm {
    height: 34px;
    padding: 0 14px;
    font-size: 13px;
  }
  .md {
    height: 42px;
    padding: 0 20px;
    font-size: 14px;
  }
  .lg {
    height: 52px;
    padding: 0 28px;
    font-size: 16px;
  }

  /* variants */
  .primary {
    background: var(--accent);
    color: var(--accent-on);
  }
  .primary:not(:disabled):hover {
    background: var(--accent-hover);
  }
  .primary:not(:disabled):active {
    background: var(--accent-press);
  }

  .secondary {
    background: var(--surface-card);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .secondary:not(:disabled):hover {
    background: var(--surface-hover);
  }

  .ghost {
    background: transparent;
    color: var(--text-primary);
  }
  .ghost:not(:disabled):hover {
    background: var(--surface-hover);
  }

  .inverse {
    background: transparent;
    color: var(--white);
    border-color: var(--border-inverse);
  }
  .inverse:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .danger {
    background: var(--danger);
    color: #fff;
  }
  .danger:not(:disabled):hover {
    background: #b23b29;
  }
</style>
