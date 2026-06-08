<script lang="ts">
  import { onMount } from "svelte";
  import { Folder, FolderOpen, ArrowRight, ChevronRight } from "@lucide/svelte";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { isActiveProject, formatDayMonth } from "$lib/utils/date";
  import { Spinner } from "$lib/components/ui";

  let loading = $state(false);

  onMount(async () => {
    if (catalog.activeProjects.length < 1) {
      loading = true;
    }

    const data = await projectsApi.list();

    const active = data
      .filter((project) => isActiveProject(project))
      .sort(
        (a, b) =>
          new Date(a.startDate).valueOf() - new Date(b.startDate).valueOf(),
      );

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
  <div class="center"><Spinner label="Laster prosjekter…" /></div>
{:else}
  <div class="grid">
    {#each catalog.activeProjects as project (project.id)}
      {@const start = formatDayMonth(project.startDate)}
      {@const end = formatDayMonth(project.endDate)}
      <a class="pcard" href={`/project/${project.id}`}>
        <div class="pcard__top">
          <span class="pcard__folder">
            <span class="f-closed"><Folder size={30} strokeWidth={1.9} /></span>
            <span class="f-open"
              ><FolderOpen size={30} strokeWidth={1.9} /></span
            >
          </span>
        </div>

        <div class="pcard__name">{project.name}</div>

        <div class="daterange">
          <div class="dbox">
            <span class="m">{start.monthShort}</span>
            <span class="d">{start.day}</span>
          </div>
          <span class="arr"><ArrowRight size={18} /></span>
          <div class="dbox">
            <span class="m">{end.monthShort}</span>
            <span class="d">{end.day}</span>
          </div>
        </div>

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
  .center {
    display: flex;
    justify-content: center;
    padding: 64px 0;
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

  .daterange {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dbox {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .dbox .m {
    width: 100%;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    padding: 3px 0;
  }
  .dbox .d {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    color: var(--text-primary);
    padding: 4px 0 5px;
    line-height: 1;
  }
  .daterange .arr {
    color: var(--text-muted);
    display: inline-flex;
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
    color: var(--text-secondary);
  }
  .pcard:hover .pcard__cta {
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
