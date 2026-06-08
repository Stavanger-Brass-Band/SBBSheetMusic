<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Button,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { projects as projectsApi } from "$lib/api/projects";
  import { formatDmy, toApiDate } from "$lib/utils/date";
  import type { NewProjectRequest, Project } from "$lib/types";
  import ProjectModalBody from "$lib/components/ProjectModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let projects = $state<Project[]>([]);
  let loading = $state(true);
  let newProject = $state<Partial<Project>>({});
  let isOpen = $state(false);
  let isSaving = $state(false);

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

<div class="mb-6 flex items-center justify-between">
  <h1 class="text-3xl font-semibold">Prosjekter</h1>
  <Button size="sm" onclick={openModal}>+ Nytt prosjekt</Button>
</div>

<Table hoverable>
  <TableHead>
    <TableHeadCell>Navn</TableHeadCell>
    <TableHeadCell>Startdato</TableHeadCell>
    <TableHeadCell>Sluttdato</TableHeadCell>
  </TableHead>
  <TableBody>
    {#each projects as project (project.id)}
      <TableBodyRow
        class="cursor-pointer"
        onclick={() => goto("/project/edit/" + project.id)}
      >
        <TableBodyCell class="font-normal">{project.name}</TableBodyCell>
        <TableBodyCell class="font-normal"
          >{formatDmy(project.startDate)}</TableBodyCell
        >
        <TableBodyCell class="font-normal"
          >{formatDmy(project.endDate)}</TableBodyCell
        >
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>

{#if loading}
  <LoadingSpinner />
{/if}

<Modal title="Nytt prosjekt" bind:open={isOpen} size="sm">
  <ProjectModalBody project={newProject} />
  {#snippet footer()}
    <Button disabled={isSaving} onclick={saveNewProject}>Lagre</Button>
    <Button color="alternative" onclick={() => (isOpen = false)}>Lukk</Button>
  {/snippet}
</Modal>
