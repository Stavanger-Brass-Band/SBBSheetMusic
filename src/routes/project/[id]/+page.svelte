<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { projects as projectsApi } from "$lib/api/projects";
  import { formatRange } from "$lib/utils/date";
  import type { Project } from "$lib/types";
  import { Breadcrumb, Badge, SetCard, Spinner } from "$lib/components/ui";

  let id = $derived(page.params.id!);
  let project = $state<Project | undefined>();
  let loading = $state(true);

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
  <div class="center"><Spinner label="Laster prosjekt…" /></div>
{:else}
  <div class="head">
    <h1 class="sbb-h1 title">{project.name}</h1>
    <div class="meta">
      <Badge variant="success" dot>Aktiv</Badge>
      <span class="sbb-mono"
        >{formatRange(project.startDate, project.endDate)}</span
      >
    </div>
  </div>

  {#if project.sets && project.sets.length > 0}
    <div class="grid">
      {#each project.sets as set (set.id)}
        <SetCard
          title={set.title}
          composer={set.composer}
          arranger={set.arranger}
          href={`/project/${project.id}/set/${set.id}`}
        />
      {/each}
    </div>
  {:else}
    <p class="empty">Ingen noter tilknyttet prosjektet enda.</p>
  {/if}
{/if}

<style>
  .center {
    display: flex;
    justify-content: center;
    padding: 64px 0;
  }
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
  .meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .meta .sbb-mono {
    font-size: 13px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 28px 24px;
  }
  .empty {
    color: var(--text-muted);
  }
</style>
