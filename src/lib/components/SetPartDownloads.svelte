<script lang="ts">
  import { onDestroy } from "svelte";
  import { ScanLine } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { downloadSetPart } from "$lib/utils/download";
  import { getPartImageUrl } from "$lib/utils/partImage";
  import type { MusicSetPart } from "$lib/types";
  import { PartTile, EmptyState } from "$lib/components/ui";

  /**
   * The download stage of a set view: one tile per part, with the parts the
   * signed-in user plays marked. Shared by the two set views — the one reached
   * from Arkivliste and the one under a project — which differ in their
   * surroundings but not in this.
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

  onDestroy(() => clearTimeout(completedTimer));

  function isMine(part: MusicSetPart): boolean {
    return (
      !!part.musicPartId && auth.assignedPartIds.includes(part.musicPartId)
    );
  }

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
    if (downloadingPart === part) return;
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

  function partStatus(part: MusicSetPart): "idle" | "loading" | "done" {
    if (downloadingPart === part) return "loading";
    if (completedPart === part) return "done";
    return "idle";
  }
</script>

<div class="stage">
  <div class="stage-head">
    <h3 class="sbb-h3 stage-title">Last ned noter</h3>
    <span class="sbb-mono count">{parts?.length ?? 0} stemmer</span>
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
