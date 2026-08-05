<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Headphones, ScanLine, FileX, Lock } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { getPartImageUrl } from "$lib/utils/partImage";
  import type { MusicSet, MusicSetPart } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    PartTile,
    EmptyState,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import PartPreviewModal from "$lib/components/PartPreviewModal.svelte";

  let setId = $derived(page.params.id!);

  let set = $state<MusicSet>({});
  let loading = $state(true);
  // The set is the page. `set` stays a plain object so the markup below can read
  // it without guarding every field, so the failed load needs saying separately.
  let loadFailed = $state(false);
  // A set the user's roles don't reach — reading the whole library still isn't
  // *unrestricted*, e.g. a role revoked mid-session. Said apart from a failed
  // load, and without naming the set.
  let forbidden = $state(false);

  let previewOpen = $state(false);
  let previewPart = $state<MusicSetPart | null>(null);

  onMount(async () => {
    const loaded = await sheetMusic.getSetWithParts(setId);
    if (loaded.status === "ok") set = loaded.data;
    else if (loaded.status === "forbidden") forbidden = true;
    else loadFailed = true;
    loading = false;
  });

  function openPreview(part: MusicSetPart) {
    previewPart = part;
    previewOpen = true;
  }
</script>

<Breadcrumb
  class="mb-6"
  items={[
    { label: "Arkivliste", href: "/archive" },
    { label: set.title ?? "" },
  ]}
/>

{#if loading}
  <LoadingSpinner label="Laster notesett…" />
{:else if forbidden}
  <EmptyState
    title="Ingen tilgang til notesettet"
    description="Du har ikke tilgang til dette notesettet. Gå tilbake til arkivet og prøv igjen."
  >
    {#snippet icon()}<Lock size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else if loadFailed}
  <EmptyState
    title="Fant ikke notesettet"
    description="Notesettet finnes ikke lenger, eller kunne ikke lastes. Gå tilbake til arkivet og prøv igjen."
  >
    {#snippet icon()}<FileX size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
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
      <h3 class="sbb-h3 stage-title">Stemmer</h3>
      <span class="sbb-mono count">{set.parts?.length ?? 0} stemmer</span>
    </div>
    {#if set.parts && set.parts.length > 0}
      <div class="parts">
        {#each set.parts as part}
          <PartTile
            name={part.name}
            instrument={getPartImageUrl(part.name)}
            onclick={() => openPreview(part)}
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

  <PartPreviewModal
    bind:open={previewOpen}
    {setId}
    part={previewPart}
    setTitle={set.title ?? ""}
  />
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
