<script lang="ts">
  import { Modal, Button } from "flowbite-svelte";

  let {
    open = $bindable(false),
    title = "Er du sikker?",
    description = "",
    confirmTitle = "Slett",
    cancelTitle = "Avbryt",
    onconfirm,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    confirmTitle?: string;
    cancelTitle?: string;
    onconfirm?: () => void;
  } = $props();

  function confirm() {
    open = false;
    onconfirm?.();
  }
</script>

<Modal {title} bind:open size="sm">
  <p class="text-gray-500 dark:text-gray-300">{description}</p>
  {#snippet footer()}
    <Button color="red" onclick={confirm}>{confirmTitle}</Button>
    <Button color="alternative" onclick={() => (open = false)}
      >{cancelTitle}</Button
    >
  {/snippet}
</Modal>
