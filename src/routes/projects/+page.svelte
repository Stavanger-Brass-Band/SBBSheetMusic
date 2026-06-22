<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { Plus, SearchX } from "@lucide/svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { formatDmy, projectStatus, toApiDate } from "$lib/utils/date";
  import type { ProjectStatus } from "$lib/utils/date";
  import type { NewProjectRequest, Project } from "$lib/types";
  import { Badge, Button, EmptyState, SearchInput } from "$lib/components/ui";
  import type { ComponentProps } from "svelte";

  // Maps a project's lifecycle phase to its status-tag label and colour.
  const statusBadge: Record<
    ProjectStatus,
    { label: string; variant: ComponentProps<typeof Badge>["variant"] }
  > = {
    upcoming: { label: "Kommende", variant: "info" },
    active: { label: "Aktiv", variant: "success" },
    ended: { label: "Avsluttet", variant: "neutral" },
  };
  import ProjectModalBody from "$lib/components/ProjectModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let projects = $state<Project[]>([]);
  let loading = $state(true);

  // Client-side search over the already-loaded list (the endpoint returns
  // every project in one call), matching on the project name.
  let searchTerm = $state("");
  let filteredProjects = $derived.by(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      (project.name ?? "").toLowerCase().includes(query),
    );
  });
  let newProject = $state<Partial<Project>>({});
  let isOpen = $state(false);
  let isSaving = $state(false);
  let canSave = $derived(
    !!newProject.name?.trim() && !!newProject.startDate && !!newProject.endDate,
  );

  onMount(async () => {
    const data = await projectsApi.list();
    if (data) {
      data.sort(
        (a, b) =>
          new Date(b.startDate).valueOf() - new Date(a.startDate).valueOf(),
      );
    }
    projects = data ?? [];
    loading = false;
  });

  async function saveNewProject() {
    if (!canSave) return;
    isSaving = true;
    const body: NewProjectRequest = {
      name: newProject.name ?? null,
      startDate: toApiDate(newProject.startDate!),
      endDate: toApiDate(newProject.endDate!),
    };

    const result = await projectsApi.create(body);
    isSaving = false;
    if (result) {
      isOpen = false;
      goto("/project/edit/" + result.id);
    }
  }

  function openModal() {
    newProject = {};
    isOpen = true;
  }
</script>

<div class="sbb-list-head">
  <h1 class="sbb-h1">Prosjekter</h1>
  <Button class="create-btn" onclick={openModal}>
    <Plus size={17} /> Nytt prosjekt
  </Button>
</div>

<SearchInput placeholder="Søk i prosjekter…" bind:value={searchTerm} />

{#if loading}
  <LoadingSpinner />
{:else if filteredProjects.length === 0 && searchTerm.trim()}
  <EmptyState
    title="Ingen treff"
    description={`Fant ingen prosjekter som matcher «${searchTerm.trim()}». Prøv et annet søk.`}
  >
    {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else}
  <Table class="sbb-table" divClass="sbb-table-wrap table-view">
    <TableHead>
      <TableHeadCell>Navn</TableHeadCell>
      <TableHeadCell>Startdato</TableHeadCell>
      <TableHeadCell>Sluttdato</TableHeadCell>
      <TableHeadCell>Status</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each filteredProjects as project (project.id)}
        {@const status = statusBadge[projectStatus(project)]}
        <TableBodyRow
          class="clickable"
          onclick={() => goto("/project/edit/" + project.id)}
        >
          <TableBodyCell>{project.name}</TableBodyCell>
          <TableBodyCell>{formatDmy(project.startDate)}</TableBodyCell>
          <TableBodyCell>{formatDmy(project.endDate)}</TableBodyCell>
          <TableBodyCell>
            <Badge variant={status.variant} dot>{status.label}</Badge>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filteredProjects as project (project.id)}
      {@const status = statusBadge[projectStatus(project)]}
      <div
        class="sbb-card clickable"
        onclick={() => goto("/project/edit/" + project.id)}
      >
        <div class="body">
          <div class="t">{project.name}</div>
          <div class="meta">
            {formatDmy(project.startDate)} – {formatDmy(project.endDate)}
          </div>
        </div>
        <div class="acts">
          <Badge variant={status.variant} dot>{status.label}</Badge>
        </div>
      </div>
    {/each}
  </div>
{/if}

<Modal title="Nytt prosjekt" bind:open={isOpen} size="md">
  <ProjectModalBody project={newProject} />
  {#snippet footer()}
    <Button loading={isSaving} disabled={!canSave} onclick={saveNewProject}>
      Lagre
    </Button>
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
  {/snippet}
</Modal>
