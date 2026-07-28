<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { Folder, FolderOpen, ChevronRight } from "@lucide/svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { dateSortValue, isActiveProject } from "$lib/utils/date";
  import { DateRangeBoxes, EmptyState } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import { cardEnter } from "$lib/utils/motion";

  let loading = $state(false);

  onMount(async () => {
    if (catalog.activeProjects.length < 1) {
      loading = true;
    }

    const data = await projectsApi.list();

    const active = data
      .filter((project) => isActiveProject(project))
      .sort((a, b) => dateSortValue(a.startDate) - dateSortValue(b.startDate));

    catalog.setActiveProjects(active);
    loading = false;
  });
</script>

<div class="intro">
  <h1 class="sbb-h1">Aktive prosjekt</h1>
  <p>
    Her finner du alle noter tilhørende korpsets aktive prosjekter. Velg et
    prosjekt for å se og laste ned notene.
  </p>
</div>

{#if loading}
  <LoadingSpinner label="Laster prosjekter…" />
{:else if catalog.activeProjects.length === 0}
  <EmptyState
    title="Ingen aktive prosjekter"
    description="Når korpset har et aktivt prosjekt med noter, dukker det opp her."
  >
    {#snippet icon()}<FolderOpen size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else}
  <div class="grid">
    {#each catalog.activeProjects as project, index (project.id)}
      <a
        class="pcard"
        href={`/project/${project.id}`}
        in:fly|global={cardEnter(index)}
      >
        <div class="pcard__top">
          <span class="pcard__folder">
            <span class="f-closed"><Folder size={30} strokeWidth={1.9} /></span>
            <span class="f-open"
              ><FolderOpen size={30} strokeWidth={1.9} /></span
            >
          </span>
        </div>

        <div class="pcard__name">{project.name}</div>

        <DateRangeBoxes start={project.startDate} end={project.endDate} />

        <div class="pcard__foot">
          <span class="pcard__cta">Se noter</span>
          <span class="pcard__arrow"><ChevronRight size={18} /></span>
        </div>
      </a>
    {/each}
  </div>
{/if}

<style>
  .intro {
    margin-bottom: 40px;
  }
  .intro h1 {
    margin: 0;
    font-size: 46px;
  }
  .intro p {
    margin: 14px 0 0;
    max-width: 560px;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(264px, 1fr));
    gap: 22px;
  }

  .pcard {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur-base) var(--ease-out);
  }
  .pcard:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
    transform: translateY(-3px);
  }
  .pcard__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pcard__folder {
    color: var(--brass-500);
    display: inline-flex;
  }
  .pcard__folder .f-open {
    display: none;
  }
  .pcard:hover .pcard__folder .f-closed {
    display: none;
  }
  .pcard:hover .pcard__folder .f-open {
    display: inline-flex;
  }

  .pcard__name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 21px;
    line-height: 1.1;
    color: var(--text-primary);
  }
  .pcard:hover .pcard__name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .pcard__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 18px;
    border-top: 1px solid var(--border-subtle);
  }
  .pcard__cta {
    font-size: 13px;
    font-weight: 600;
    color: var(--brass-500);
  }
  .pcard__arrow {
    color: var(--text-muted);
    display: inline-flex;
  }
  .pcard:hover .pcard__arrow {
    color: var(--brass-500);
  }
</style>
