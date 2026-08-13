<script lang="ts">
  import { onDestroy } from "svelte";
  import { Sparkles, CircleAlert, FileText } from "@lucide/svelte";
  import type { PdfImportResult } from "$lib/api/client";
  import { Spinner } from "$lib/components/ui";

  /**
   * Drop zone for importing one combined score PDF, shared by the two places it
   * can start from: a new set on the archive list, and more parts on a set that
   * already exists. Both hand it a function that runs the import and differ only
   * in what happens afterwards, so this owns everything up to the answer — the
   * file check, the wait, and saying which way it failed — and hands control
   * back through `onimported`.
   */
  let {
    description,
    importFile,
    onimported,
    failedMessage = "Importen feilet. Prøv igjen.",
  }: {
    description: string;
    /** Runs the import. Its `PdfImportResult` decides what the reader is told. */
    importFile: (file: File) => Promise<PdfImportResult<unknown>>;
    /** Called after an import that landed, for the caller to act on it. */
    onimported?: () => void | Promise<void>;
    /**
     * What to say when the import failed for no stated reason. A request this
     * long can also be cut off by the gateway while the API keeps working, so
     * each caller words its own — the two of them have different things for the
     * reader to go and check.
     */
    failedMessage?: string;
  } = $props();

  /** The API's own upload ceiling (`MaxFileSize`), checked here to save the trip. */
  const MAX_PDF_BYTES = 300_000_000;

  let fileInput: HTMLInputElement;
  let dragging = $state(false);
  let importing = $state(false);
  let importingFileName = $state("");
  let errorMessage = $state("");
  // The wait has no progress to report — one request covers OCR, the model calls
  // and every upload — so the seconds are the only honest sign of life.
  let elapsedSeconds = $state(0);
  let elapsedTimer: ReturnType<typeof setInterval> | undefined;

  let elapsedLabel = $derived(
    elapsedSeconds < 60
      ? `${elapsedSeconds} sek`
      : `${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} sek`,
  );

  onDestroy(() => clearInterval(elapsedTimer));

  /** Why this file can't be sent, or "" when it can. */
  function rejectionFor(file: File): string {
    if (file.type !== "application/pdf")
      return "Bare PDF-filer kan importeres.";
    if (file.size > MAX_PDF_BYTES)
      return "Filen er for stor. Grensen er 300 MB.";
    return "";
  }

  function messageFor(status: PdfImportResult<unknown>["status"]): string {
    switch (status) {
      case "invalidFile":
        return "Filen kunne ikke leses som PDF. Sjekk at den åpner seg, og at den ikke er passordbeskyttet.";
      case "noMetadata":
        return "Fant ingen tittel i toppteksten på sidene. Registrer settet manuelt, og importer stemmene fra PDF etterpå.";
      case "notFound":
        return "Notesettet finnes ikke lenger.";
      case "ocrUnavailable":
        return "Tekstgjenkjenningen er utilgjengelig akkurat nå. Prøv igjen senere.";
      default:
        return failedMessage;
    }
  }

  async function startImport(files: FileList | null) {
    const file = files?.[0];
    if (!file || importing) return;

    const rejection = rejectionFor(file);
    if (rejection) {
      errorMessage = rejection;
      return;
    }

    errorMessage = "";
    importingFileName = file.name;
    importing = true;
    elapsedSeconds = 0;
    elapsedTimer = setInterval(() => (elapsedSeconds += 1), 1000);

    const result = await importFile(file);

    clearInterval(elapsedTimer);
    importing = false;
    importingFileName = "";

    if (result.status === "ok") await onimported?.();
    else errorMessage = messageFor(result.status);
  }
</script>

<input
  bind:this={fileInput}
  type="file"
  accept="application/pdf"
  hidden
  onchange={(e) => {
    startImport(e.currentTarget.files);
    e.currentTarget.value = "";
  }}
/>

{#if importing}
  <div class="working">
    <span class="working__icon"><Spinner size={20} inline /></span>
    <div class="working__body">
      <div class="working__name">
        <FileText size={15} />
        {importingFileName}
      </div>
      <div class="working__status">
        Leser sidene og deler opp filen… {elapsedLabel}
      </div>
      <div class="working__note">
        Dette kan ta flere minutter på et helt sett. Ikke lukk fanen.
      </div>
    </div>
  </div>
{:else}
  <div
    class="drop"
    class:drag={dragging}
    role="button"
    tabindex="0"
    onclick={() => fileInput.click()}
    onkeydown={(e) => (e.key === "Enter" ? fileInput.click() : null)}
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(e) => {
      e.preventDefault();
      dragging = false;
      startImport(e.dataTransfer?.files ?? null);
    }}
  >
    <span class="drop__icon"><Sparkles size={30} /></span>
    <div class="drop__title">
      Dra samle-PDF-en hit, eller <span class="drop__link">velg fil</span>
    </div>
    <div class="drop__hint">{description}</div>
  </div>
{/if}

{#if errorMessage}
  <p class="error"><CircleAlert size={15} /> {errorMessage}</p>
{/if}

<style>
  .drop {
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-md);
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .drop:hover,
  .drop.drag {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .drop__icon {
    color: var(--brass-500);
    display: inline-flex;
    margin-bottom: 8px;
  }
  .drop__title {
    font-weight: 600;
    font-size: 15px;
  }
  .drop__link {
    color: var(--accent);
  }
  .drop__hint {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .working {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
    padding: 16px 18px;
  }
  .working__icon {
    color: var(--accent);
    display: inline-flex;
    margin-top: 2px;
  }
  .working__name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }
  .working__status {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 3px;
  }
  .working__note {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-top: 6px;
  }

  .error {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin: 12px 0 0;
    font-size: 13px;
    color: var(--danger);
  }
</style>
