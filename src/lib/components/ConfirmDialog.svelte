<script lang="ts">
  import type { Snippet } from "svelte";
  import { Modal } from "flowbite-svelte";
  import { Trash2 } from "@lucide/svelte";
  import { Button } from "$lib/components/ui";

  let {
    open = $bindable(false),
    title = "Er du sikker?",
    description = "",
    confirmTitle = "Slett",
    cancelTitle = "Avbryt",
    variant = "danger",
    icon,
    onconfirm,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    confirmTitle?: string;
    cancelTitle?: string;
    /** `danger` (red) for destructive actions, `warning` (brass) for cautions. */
    variant?: "danger" | "warning";
    /** Optional icon override; defaults to a trash icon. */
    icon?: Snippet;
    onconfirm?: () => void;
  } = $props();

  function confirm() {
    open = false;
    onconfirm?.();
  }
</script>

<Modal bind:open size="sm" classes={{ body: "p-0" }}>
  <div class="confirm">
    <div class="confirm__main">
      <span class="badge {variant}">
        {#if icon}
          {@render icon()}
        {:else}
          <Trash2 size={22} />
        {/if}
      </span>
      <h3 class="confirm__title">{title}</h3>
      {#if description}
        <p class="confirm__desc">{description}</p>
      {/if}
    </div>
    <div class="confirm__actions">
      <Button variant="secondary" onclick={() => (open = false)}>
        {cancelTitle}
      </Button>
      <Button
        variant={variant === "danger" ? "danger" : "primary"}
        onclick={confirm}
      >
        {#if variant === "danger"}<Trash2 size={16} />{/if}
        {confirmTitle}
      </Button>
    </div>
  </div>
</Modal>

<style>
  .confirm__main {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 28px 26px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    margin-bottom: 18px;
  }
  .badge.danger {
    background: var(--danger-soft);
    color: var(--danger);
  }
  .badge.warning {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .confirm__title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 24px;
    line-height: 1.2;
    color: var(--text-primary);
  }
  .confirm__desc {
    margin: 10px 0 0;
    max-width: 360px;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .confirm__actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 18px 28px 22px;
    border-top: 1px solid var(--border-subtle);
  }
</style>
