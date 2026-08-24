<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { Headphones, Lock } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import type { MusicSet } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    EmptyState,
    LoadFailed,
  } from "$lib/components/ui";
  import SetPartDownloads from "$lib/components/SetPartDownloads.svelte";
  import SetProjectHistory from "$lib/components/SetProjectHistory.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

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

  async function loadSet() {
    loading = true;
    loadFailed = false;
    const loaded = await sheetMusic.getSetWithParts(setId);
    if (loaded.status === "ok") set = loaded.data;
    else if (loaded.status === "forbidden") forbidden = true;
    else loadFailed = true;
    loading = false;
  }

  onMount(loadSet);
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
  <LoadFailed
    title="Fant ikke notesettet"
    description="Notesettet kunne ikke lastes. Det kan også ha blitt slettet fra arkivet."
    onretry={loadSet}
  />
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

  <SetPartDownloads
    {setId}
    setTitle={set.title ?? ""}
    parts={set.parts}
    missingParts={set.missingParts}
  />

  <div class="history">
    <SetProjectHistory setId={set.id} archiveNumber={set.archiveNumber} />
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
  .history {
    margin-top: 28px;
    max-width: 760px;
  }
</style>
