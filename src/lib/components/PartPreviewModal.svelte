<script lang="ts">
  import { onDestroy } from "svelte";
  import { Modal } from "flowbite-svelte";
  import { Download, Share2, Lock, FileX } from "@lucide/svelte";
  import { fetchSetPartPdf, downloadPdf } from "$lib/utils/download";
  import type { MusicSetPart } from "$lib/types";
  import { Button, EmptyState } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let {
    open = $bindable(false),
    setId,
    part,
    setTitle,
  }: {
    open?: boolean;
    setId: string;
    part: MusicSetPart | null;
    setTitle: string;
  } = $props();

  let loading = $state(false);
  let forbidden = $state(false);
  let failed = $state(false);
  let shareError = $state("");
  let previewUrl = $state("");
  let canShareFile = $state(false);
  let pdfBlob = $state<Blob | null>(null);
  // The part the current preview belongs to — closing (or switching parts)
  // resets this so reopening spends a fresh one-time token rather than
  // replaying an already-consumed one.
  let loadedFor: MusicSetPart | null = null;

  let filename = $derived(`${setTitle} - ${part?.name ?? ""}.pdf`);
  let dialogTitle = $derived(`${setTitle} - ${part?.name ?? ""}`);

  $effect(() => {
    if (open && part) {
      if (part !== loadedFor) {
        loadedFor = part;
        load(part);
      }
    } else {
      loadedFor = null;
      cleanup();
    }
  });

  onDestroy(cleanup);

  async function load(currentPart: MusicSetPart) {
    loading = true;
    forbidden = false;
    failed = false;
    shareError = "";
    cleanup();

    const result = await fetchSetPartPdf(setId, currentPart.name ?? "");
    // The modal may have moved to a different part (or closed) while this was
    // in flight — its result belongs to a token nobody wants anymore.
    if (loadedFor !== currentPart) return;

    if (result.status === "forbidden") {
      forbidden = true;
      loading = false;
      return;
    }
    if (result.status === "failed") {
      failed = true;
      loading = false;
      return;
    }

    pdfBlob = new Blob([result.blob], { type: "application/pdf" });
    previewUrl = URL.createObjectURL(pdfBlob);

    const shareFile = new File([pdfBlob], filename, {
      type: "application/pdf",
    });
    canShareFile =
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [shareFile] });

    loading = false;
  }

  function cleanup() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    pdfBlob = null;
    canShareFile = false;
  }

  function download() {
    if (pdfBlob) downloadPdf(pdfBlob, filename);
  }

  async function share() {
    if (!pdfBlob) return;
    shareError = "";
    const file = new File([pdfBlob], filename, { type: "application/pdf" });
    try {
      await navigator.share({ files: [file], title: filename });
    } catch (error) {
      // The user dismissing the share sheet throws AbortError — not a failure
      // worth surfacing.
      if ((error as DOMException)?.name !== "AbortError") {
        shareError = "Deling feilet. Last ned i stedet.";
      }
    }
  }
</script>

<Modal
  title={dialogTitle}
  bind:open
  size="none"
  class="!w-[95vw] !max-w-[95vw] !h-[90vh] !max-h-[90vh]"
  classes={{ body: "p-0 md:p-0 flex-1" }}
>
  {#if loading}
    <LoadingSpinner label="Laster stemme…" />
  {:else if forbidden}
    <EmptyState
      title="Ingen tilgang"
      description="Du har ikke tilgang til å vise denne stemmen."
    >
      {#snippet icon()}<Lock size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else if failed}
    <EmptyState
      title="Kunne ikke laste stemmen"
      description="Prøv igjen om litt."
    >
      {#snippet icon()}<FileX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else if previewUrl}
    <div class="preview-wrap">
      <iframe
        src={previewUrl}
        title={part?.name ?? "Forhåndsvisning"}
        class="preview"
      ></iframe>
      {#if shareError}
        <p class="action-error">{shareError}</p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="ghost" onclick={() => (open = false)}>Lukk</Button>
    {#if canShareFile}
      <Button variant="secondary" onclick={share}>
        <Share2 size={16} /> Del
      </Button>
    {/if}
    <Button onclick={download} disabled={!pdfBlob}>
      <Download size={16} /> Last ned
    </Button>
  {/snippet}
</Modal>

<style>
  .preview-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .preview {
    flex: 1;
    width: 100%;
    border: none;
    background: var(--white);
  }
  .action-error {
    flex-shrink: 0;
    margin: 0;
    padding: 10px 16px;
    font-size: 13px;
    color: var(--danger);
  }
</style>
