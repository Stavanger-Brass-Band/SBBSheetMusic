<script lang="ts">
  import { onDestroy } from "svelte";
  import { Download, ScanLine } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { downloadSetPart } from "$lib/utils/download";
  import { getPartImageUrl } from "$lib/utils/partImage";
  import type { MusicSetPart } from "$lib/types";
  import { Button, PartTile, EmptyState } from "$lib/components/ui";

  /**
   * The download stage of a set view: one tile per part, the parts the signed-in
   * user plays marked and offered as a batch. Shared by the two set views — the
   * one reached from Arkivliste and the one under a project — which differ in
   * their surroundings but not in this.
   */
  let {
    setId,
    setTitle,
    parts,
  }: {
    setId: string;
    setTitle: string;
    // Nullable as well as optional: that is how the set response types it, and a
    // set with nothing scanned in yet is the ordinary case behind it.
    parts: MusicSetPart[] | null | undefined;
  } = $props();

  let downloadingPart = $state<MusicSetPart | null>(null);
  // The part whose download just finished — shows a success check that the
  // timer below clears after a moment.
  let completedPart = $state<MusicSetPart | null>(null);
  let completedTimer: ReturnType<typeof setTimeout> | undefined;
  // Why the last download didn't happen, if it didn't.
  let downloadError = $state("");
  // Progress through the batch of the user's own parts, e.g. "2 av 3".
  let batchProgress = $state("");

  onDestroy(() => clearTimeout(completedTimer));

  function isMine(part: MusicSetPart): boolean {
    return (
      !!part.musicPartId && auth.assignedPartIds.includes(part.musicPartId)
    );
  }

  /**
   * The user's own parts in this set, at most one per name. A set can hold several
   * entries sharing a `musicPartId` (which is why these lists are unkeyed), and
   * the PDF endpoint addresses a part by name, so two entries with the same name
   * would fetch the same file twice.
   */
  let myParts = $derived.by(() => {
    const mine = (parts ?? []).filter(isMine);
    // Keyed by name, so duplicates collapse while the catalogue order the set
    // came back in survives.
    return [...new Map(mine.map((part) => [part.name ?? "", part])).values()];
  });

  let isDownloadingBatch = $derived(batchProgress !== "");

  function messageFor(outcome: "forbidden" | "failed"): string {
    return outcome === "forbidden"
      ? "Du har ikke tilgang til å laste ned denne stemmen."
      : "Nedlastingen feilet. Prøv igjen.";
  }

  function flashCompleted(part: MusicSetPart): void {
    completedPart = part;
    clearTimeout(completedTimer);
    completedTimer = setTimeout(() => (completedPart = null), 1600);
  }

  async function downloadPart(part: MusicSetPart) {
    if (downloadingPart === part || isDownloadingBatch) return;
    downloadingPart = part;
    downloadError = "";
    try {
      const outcome = await downloadSetPart(
        setId,
        part.name ?? "",
        setTitle ?? "",
      );
      if (outcome !== "done") {
        downloadError = messageFor(outcome);
        return;
      }
      flashCompleted(part);
    } finally {
      downloadingPart = null;
    }
  }

  /**
   * Download every part of this set the user plays. Each download needs its own
   * one-time token, so they go one at a time — there is no endpoint for a subset
   * of a set — and the tile being fetched shows its own spinner as the run moves
   * through them. A failure stops the run rather than firing the rest at a
   * service that has just refused, and says how far it got so the user knows what
   * landed in their downloads folder.
   */
  async function downloadMyParts() {
    if (isDownloadingBatch || myParts.length === 0) return;
    downloadError = "";
    const queue = myParts;

    try {
      for (const [index, part] of queue.entries()) {
        batchProgress = `${index + 1} av ${queue.length}`;
        downloadingPart = part;
        const outcome = await downloadSetPart(
          setId,
          part.name ?? "",
          setTitle ?? "",
        );
        if (outcome !== "done") {
          const reason =
            outcome === "forbidden"
              ? "Du har ikke tilgang til alle stemmene dine i dette settet."
              : "Nedlastingen feilet.";
          downloadError =
            index > 0
              ? `${reason} ${index} av ${queue.length} stemmer ble lastet ned.`
              : `${reason} Prøv igjen.`;
          return;
        }
        flashCompleted(part);
      }
    } finally {
      downloadingPart = null;
      batchProgress = "";
    }
  }

  function partStatus(part: MusicSetPart): "idle" | "loading" | "done" {
    if (downloadingPart === part) return "loading";
    if (completedPart === part) return "done";
    return "idle";
  }
</script>

<div class="stage">
  <div class="stage-head">
    <h3 class="sbb-h3 stage-title">Last ned noter</h3>
    <div class="stage-actions">
      <span class="sbb-mono count">{parts?.length ?? 0} stemmer</span>
      {#if myParts.length > 0}
        <Button
          size="sm"
          loading={isDownloadingBatch}
          disabled={downloadingPart !== null}
          onclick={downloadMyParts}
        >
          {#if isDownloadingBatch}
            Laster ned {batchProgress}…
          {:else}
            <Download size={15} /> Last ned mine stemmer ({myParts.length})
          {/if}
        </Button>
      {/if}
    </div>
  </div>

  {#if downloadError}
    <p class="download-error">{downloadError}</p>
  {/if}

  {#if parts && parts.length > 0}
    <div class="parts">
      {#each parts as part}
        <PartTile
          name={part.name}
          instrument={getPartImageUrl(part.name)}
          status={partStatus(part)}
          mine={isMine(part)}
          onclick={() => downloadPart(part)}
        />
      {/each}
    </div>
  {:else}
    <EmptyState
      title="Ikke skannet enda"
      description="Notene til dette settet har ikke blitt skannet inn i arkivet enda."
    >
      {#snippet icon()}<ScanLine size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
</div>

<style>
  .stage {
    margin-top: 28px;
  }
  .stage-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }
  .stage-title {
    margin: 0;
    color: var(--white);
    font-size: 22px;
  }
  .stage-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .count {
    font-size: 12px;
    color: var(--gray-400);
  }
  .parts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  /* The stage sits on the dark surface, so the danger token needs lifting. */
  .download-error {
    margin: 0 0 16px;
    font-size: 13px;
    color: color-mix(in srgb, var(--danger) 70%, var(--white));
  }
</style>
