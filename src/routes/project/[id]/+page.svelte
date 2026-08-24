<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Music, Lock, Pencil } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { catalogData } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import type { Project } from "$lib/types";
  import {
    Breadcrumb,
    Button,
    SetCard,
    DateRangeBoxes,
    EmptyState,
    LoadFailed,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import ProjectDescription from "$lib/components/ProjectDescription.svelte";
  import { cardEnter } from "$lib/utils/motion";

  let id = $derived(page.params.id!);
  let project = $state<Project | undefined>();
  let loading = $state(true);
  // The roles refusing this project is not the same dead end as one that failed
  // to load, and neither state may name the project it couldn't show.
  let forbidden = $state(false);
  let setCount = $derived(project?.sets?.length ?? 0);
  /**
   * The way from a project as a member sees it to the same project as its editor.
   * Gated on the very flag `requireManageProjects` guards that page with, so the
   * shortcut is offered exactly when it will be let through.
   */
  let canEditProject = $derived(auth.canManageProjects);

  async function loadProject() {
    loading = true;
    const [info, sets] = await Promise.all([
      projectsApi.get(id),
      projectsApi.getSets(id),
    ]);
    // A project that didn't load leaves `project` unset, which the markup shows
    // as a dead end rather than an empty page dressed up as a real project.
    if (info.status === "ok") {
      info.data.sets = catalogData(sets) ?? [];
      project = info.data;
    } else {
      forbidden = info.status === "forbidden";
    }
    loading = false;
  }

  onMount(loadProject);
</script>

<Breadcrumb
  class="mb-6"
  items={[{ label: "Hjem", href: "/" }, { label: project?.name ?? "-" }]}
/>

{#if loading}
  <LoadingSpinner label="Laster prosjekt…" />
{:else if forbidden}
  <EmptyState
    title="Ingen tilgang til prosjektet"
    description="Du har ikke tilgang til dette prosjektet. Gå tilbake til Hjem for å se de aktive prosjektene du har tilgang til."
  >
    {#snippet icon()}<Lock size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else if !project}
  <LoadFailed
    title="Fant ikke prosjektet"
    description="Prosjektet kunne ikke lastes. Det kan også ha blitt slettet."
    onretry={loadProject}
  />
{:else}
  <div class="head">
    <div class="head__text">
      <h1 class="sbb-h1 title">{project.name}</h1>
      <p class="subtitle sbb-mono">{setCount} sett</p>
    </div>
    <div class="meta">
      <DateRangeBoxes start={project.startDate} end={project.endDate} />
      {#if canEditProject}
        <Button
          variant="secondary"
          iconOnly
          aria-label="Rediger prosjekt"
          title="Rediger prosjekt"
          onclick={() => goto(`/project/edit/${project?.id}`)}
        >
          <Pencil size={17} />
        </Button>
      {/if}
    </div>
  </div>

  <!-- Sits tighter under the head than the 36px gap the grid gets. -->
  <ProjectDescription class="-mt-3 mb-9" description={project.comments} />

  {#if project.sets && project.sets.length > 0}
    <div class="grid">
      {#each project.sets as set, index (set.id)}
        <div in:fly|global={cardEnter(index)}>
          <!-- Numbered, because the order these come back in is a real one: the
               project editor arranges it (`updateSetOrder`) and the API serves
               the sets in it, so an unnumbered grid threw that away and read as
               a folder rather than a programme.

               Deliberately not *labelled* as the concert order. It rarely is one
               yet — it takes shape over the project and is still being moved
               about close to the concert — so the numbers say "this is the order
               as it stands", which is true throughout, while a caption saying
               "konsertrekkefølge" would promise a decision nobody has made. -->
          <SetCard
            title={set.title}
            composer={set.composer}
            arranger={set.arranger}
            ordinal={index + 1}
            href={`/project/${project.id}/set/${set.id}`}
          />
        </div>
      {/each}
    </div>
  {:else}
    <EmptyState
      title="Ingen noter enda"
      description="Det er ikke knyttet noter til dette prosjektet enda."
    >
      {#snippet icon()}<Music size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{/if}

<style>
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 36px;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .subtitle {
    margin: 8px 0 0;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 28px 24px;
  }
  /* A 1fr track is minmax(auto, 1fr); its auto floor is the card's min-content
     width, so a longer title in one column makes that track refuse to shrink
     and forces the other to absorb the deficit. min-width: 0 removes the floor
     so both columns shrink in step and stay symmetric on narrow screens. */
  .grid > div {
    min-width: 0;
  }
  /* On phones the 200px min collapses to a single column; force two. */
  @media (max-width: 640px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 18px 14px;
    }
  }
</style>
