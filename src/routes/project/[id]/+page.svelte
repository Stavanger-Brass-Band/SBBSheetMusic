<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { page } from "$app/state";
  import { Music } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import type { Project } from "$lib/types";
  import {
    Breadcrumb,
    SetCard,
    DateRangeBoxes,
    EmptyState,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import ProjectDescription from "$lib/components/ProjectDescription.svelte";
  import { cardEnter } from "$lib/utils/motion";

  let id = $derived(page.params.id!);
  let project = $state<Project | undefined>();
  let loading = $state(true);
  let setCount = $derived(project?.sets?.length ?? 0);

  onMount(async () => {
    const [info, sets] = await Promise.all([
      projectsApi.get(id),
      projectsApi.getSets(id),
    ]);
    info.sets = sets;
    project = info;
    loading = false;
  });
</script>

<Breadcrumb
  class="mb-6"
  items={[{ label: "Hjem", href: "/" }, { label: project?.name ?? "-" }]}
/>

{#if loading || !project}
  <LoadingSpinner label="Laster prosjekt…" />
{:else}
  <div class="head">
    <div class="head__text">
      <h1 class="sbb-h1 title">{project.name}</h1>
      <p class="subtitle sbb-mono">{setCount} sett</p>
    </div>
    <div class="meta">
      <DateRangeBoxes start={project.startDate} end={project.endDate} />
    </div>
  </div>

  <!-- Sits tighter under the head than the 36px gap the grid gets. -->
  <ProjectDescription class="-mt-3 mb-9" description={project.comments} />

  {#if project.sets && project.sets.length > 0}
    <div class="grid">
      {#each project.sets as set, index (set.id)}
        <div in:fly|global={cardEnter(index)}>
          <SetCard
            title={set.title}
            composer={set.composer}
            arranger={set.arranger}
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
