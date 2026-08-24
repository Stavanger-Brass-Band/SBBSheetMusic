<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Headphones, Lock, Pencil } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { projects as projectsApi } from "$lib/api/projects";
  import { catalogData } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import type { MusicSet, Project } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    EmptyState,
    LoadFailed,
  } from "$lib/components/ui";
  import SetPartDownloads from "$lib/components/SetPartDownloads.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let setId = $derived(page.params.id!);
  let projectId = $derived(page.params.projectId!);

  let set = $state<MusicSet>({});
  let project = $state<Project | undefined>();
  let loading = $state(true);
  // The set is the page. `set` stays a plain object so the markup below can read
  // it without guarding every field, so the failed load needs saying separately.
  let loadFailed = $state(false);
  // A set the user's roles don't reach — a Musikant following a link to a set
  // that has left the active projects. Said apart from a failed load, and
  // without naming the set.
  let forbidden = $state(false);

  /**
   * The way from a set as a member sees it to the same set as its editor. Gated on
   * the very flag `requireManageMusic` guards that page with, so the shortcut is
   * offered exactly when it will be let through.
   */
  let canEditSet = $derived(auth.canManageMusic);

  async function loadSet() {
    loading = true;
    loadFailed = false;
    const loaded = await sheetMusic.getSetWithParts(setId);
    if (loaded.status === "ok") set = loaded.data;
    else if (loaded.status === "forbidden") forbidden = true;
    else loadFailed = true;
    project = catalogData(await projectsApi.get(projectId));
    loading = false;
  }

  onMount(loadSet);
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
{:else if forbidden}
  <EmptyState
    title="Ingen tilgang til notesettet"
    description="Du har ikke tilgang til dette notesettet. Gå tilbake til Hjem for å se notene du har tilgang til."
  >
    {#snippet icon()}<Lock size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else if loadFailed}
  <LoadFailed
    title="Fant ikke notesettet"
    description="Notesettet kunne ikke lastes. Det kan også ha blitt fjernet fra prosjektet."
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
    <!-- Only rendered when it holds something: an empty flex item would still
         take the head's own gap. The listening example leads, since it is what
         the page is for — editing is the shortcut. -->
    {#if set.recordingUrl || canEditSet}
      <div class="actions">
        {#if set.recordingUrl}
          <Button
            variant="secondary"
            onclick={() => window.open(set.recordingUrl ?? "", "_blank")}
          >
            <Headphones size={16} /> Åpne lytteeksempel
          </Button>
        {/if}
        {#if canEditSet}
          <Button
            variant="secondary"
            iconOnly
            aria-label="Rediger notesett"
            title="Rediger notesett"
            onclick={() => goto(`/set/edit/${setId}`)}
          >
            <Pencil size={17} />
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <SetPartDownloads
    {setId}
    setTitle={set.title ?? ""}
    parts={set.parts}
    missingParts={set.missingParts}
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
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
</style>
