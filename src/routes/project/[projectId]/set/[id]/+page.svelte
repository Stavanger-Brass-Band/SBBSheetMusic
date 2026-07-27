<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { Headphones, ScanLine } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { projects as projectsApi } from "$lib/api/projects";
  import { downloadSetPart } from "$lib/utils/download";
  import type { MusicSet, MusicSetPart, Project } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    PartTile,
    EmptyState,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let setId = $derived(page.params.id!);
  let projectId = $derived(page.params.projectId!);

  let set = $state<MusicSet>({});
  let project = $state<Project | undefined>();
  let downloadingPart = $state<MusicSetPart | null>(null);
  // The part whose download just finished — shows a success check that the
  // timer below clears after a moment.
  let completedPart = $state<MusicSetPart | null>(null);
  let completedTimer: ReturnType<typeof setTimeout> | undefined;
  let loading = $state(true);

  onMount(async () => {
    set = await sheetMusic.getSetWithParts(setId);
    project = await projectsApi.get(projectId);
    loading = false;
  });

  onDestroy(() => clearTimeout(completedTimer));

  async function downloadPart(part: MusicSetPart) {
    if (downloadingPart === part) return;
    downloadingPart = part;
    try {
      await downloadSetPart(setId, part.name ?? "", set.title ?? "");
      completedPart = part;
      clearTimeout(completedTimer);
      completedTimer = setTimeout(() => (completedPart = null), 1600);
    } finally {
      downloadingPart = null;
    }
  }

  function partStatus(part: MusicSetPart): "idle" | "loading" | "done" {
    if (downloadingPart === part) return "loading";
    if (completedPart === part) return "done";
    return "idle";
  }

  function getPartImageUrl(part: MusicSetPart): string {
    const name = (part.name ?? "").toLowerCase();
    let file: string;
    switch (true) {
      case name.indexOf("ess kornett") !== -1 ||
        name.indexOf("esskornett") !== -1 ||
        name.indexOf("sopran") !== -1:
        file = "EbCornet.jpg";
        break;
      case name.indexOf("kornett") !== -1 || name.indexOf("repiano") !== -1:
        file = "BbCornet.jpg";
        break;
      case name.indexOf("flygelhorn") !== -1:
        file = "Flugelhorn.jpg";
        break;
      case name.indexOf("horn") !== -1:
        file = "EbHorn.jpg";
        break;
      case name.indexOf("baryton") !== -1:
        file = "Baryton.jpg";
        break;
      case name.indexOf("trombone") !== -1:
        file = "Trombone.jpg";
        break;
      case name.indexOf("euphonium") !== -1:
        file = "Euphonium.jpg";
        break;
      case name.indexOf("tuba") !== -1 || name.indexOf("bass") !== -1:
        file = "Tuba.jpg";
        break;
      case name.indexOf("percussion") !== -1 ||
        name.indexOf("slagverk") !== -1 ||
        name.indexOf("klokkespill") !== -1 ||
        name.indexOf("melodisk") !== -1 ||
        name.indexOf("timpani") !== -1:
        file = "Drums.jpg";
        break;
      case name.indexOf("partitur") !== -1:
        file = "Conductor.jpg";
        break;
      default:
        file = "music-notes-compressed.jpg";
        break;
    }
    return "/img/" + file;
  }
</script>

<Breadcrumb
  class="mb-6"
  items={[
    { label: "Hjem", href: "/" },
    { label: project?.name ?? "", href: `/project/${project?.id}` },
    { label: set.title ?? "" },
  ]}
/>

{#if loading}
  <LoadingSpinner label="Laster notesett…" />
{:else}
  <div class="head">
    <div>
      <h1 class="sbb-h1 title">{set.title ?? ""}</h1>
      <div class="byline">
        {set.composer ?? ""}{set.arranger ? `  ·  Arr. ${set.arranger}` : ""}
      </div>
      {#if set.categories?.length}
        <div class="cats">
          {#each set.categories as category (category.id)}
            <Badge variant="neutral">{category.name}</Badge>
          {/each}
        </div>
      {/if}
    </div>
    {#if set.recordingUrl}
      <Button
        variant="secondary"
        onclick={() => window.open(set.recordingUrl ?? "", "_blank")}
      >
        <Headphones size={16} /> Åpne lytteeksempel
      </Button>
    {/if}
  </div>

  <div class="stage">
    <div class="stage-head">
      <h3 class="sbb-h3 stage-title">Last ned noter</h3>
      <span class="sbb-mono count">{set.parts?.length ?? 0} stemmer</span>
    </div>
    {#if set.parts && set.parts.length > 0}
      <div class="parts">
        {#each set.parts as part}
          <PartTile
            name={part.name}
            instrument={getPartImageUrl(part)}
            status={partStatus(part)}
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
{/if}

<style>
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 12px;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .byline {
    font-family: var(--font-text);
    font-size: 16px;
    color: var(--text-secondary);
    margin-top: 8px;
  }
  .cats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .stage {
    margin-top: 28px;
  }
  .stage-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
</style>
