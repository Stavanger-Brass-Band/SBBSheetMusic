<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label = "",
    helper = "",
    error = "",
    type = "text",
    value = "",
    oninput,
    placeholder = "",
    id = undefined,
    icon,
    ...rest
  }: {
    label?: string;
    helper?: string;
    error?: string;
    type?: string;
    value?: string | number | undefined;
    oninput?: (e: Event) => void;
    placeholder?: string;
    id?: string;
    icon?: Snippet;
    [key: string]: unknown;
  } = $props();
</script>

<div class="field">
  {#if label}<label class="lbl" for={id}>{label}</label>{/if}
  <div class="wrap" class:has-icon={!!icon} class:error={!!error}>
    {#if icon}<span class="icon">{@render icon()}</span>{/if}
    <input {id} {type} {value} {placeholder} {oninput} {...rest} />
  </div>
  {#if error || helper}
    <span class="msg" class:err={!!error}>{error || helper}</span>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lbl {
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary);
  }
  .wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .icon {
    position: absolute;
    left: 12px;
    display: flex;
    color: var(--text-muted);
    pointer-events: none;
  }
  input {
    width: 100%;
    height: 42px;
    padding: 0 14px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--surface-card);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .has-icon input {
    padding-left: 38px;
  }
  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(234, 91, 12, 0.18);
  }
  .error input {
    border-color: var(--danger);
  }
  .msg {
    font-family: var(--font-text);
    font-size: 12px;
    color: var(--text-muted);
  }
  .msg.err {
    color: var(--danger);
  }
</style>
