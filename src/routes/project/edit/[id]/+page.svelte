<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Button,
    Dropdown,
    DropdownItem,
    DropdownDivider,
    Card,
    Search,
    Alert,
  } from "flowbite-svelte";
  import { Breadcrumb } from "$lib/components/ui";
  import { TrashBinOutline, ChevronDownOutline } from "flowbite-svelte-icons";
  import { projects as projectsApi } from "$lib/api/projects";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { toApiDate } from "$lib/utils/date";
  import type { MusicSet, Project, UpdateProjectRequest } from "$lib/types";
  import ProjectModalBody from "$lib/components/ProjectModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import FancyDateView from "$lib/components/FancyDateView.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let id = $derived(page.params.id!);

  let project = $state<Project>({
    id: "",
    name: "",
    startDate: "",
    endDate: "",
  });
  let sets = $state<MusicSet[]>([]);
  let loading = $state(true);
  let loadingModal = $state(false);
  let editProjectModalIsOpen = $state(false);
  let addMusicSetModalIsOpen = $state(false);
  let confirmDeleteOpen = $state(false);
  let selectedMusicSets = $state<string[]>([]);
  let isSavingProject = $state(false);
  let searchTerm = $state("");

  let filteredMusicSets = $derived(
    catalog.musicSets.filter((set) => {
      const term = searchTerm.toUpperCase();
      return (
        (set.title && set.title.toUpperCase().indexOf(term) !== -1) ||
        (set.composer && set.composer.toUpperCase().indexOf(term) !== -1) ||
        (set.arranger && set.arranger.toUpperCase().indexOf(term) !== -1)
      );
    }),
  );

  onMount(async () => {
    const [info, projectSets] = await Promise.all([
      projectsApi.get(id),
      projectsApi.getSets(id),
    ]);
    project = info;
    sets = projectSets;
    loading = false;
  });

  async function saveProject() {
    isSavingProject = true;
    const body: UpdateProjectRequest = {
      name: project.name,
      startDate: toApiDate(project.startDate),
      endDate: toApiDate(project.endDate),
    };

    const result = await projectsApi.update(id, body);
    isSavingProject = false;
    if (result) {
      editProjectModalIsOpen = false;
      project = result;
    }
  }

  async function removeProject() {
    const result = await projectsApi.remove(id);
    if (result.status === 204) {
      goto("/projects");
    }
  }

  async function openAddSetModal() {
    selectedMusicSets = [];
    addMusicSetModalIsOpen = true;

    if (catalog.musicSets.length < 1) {
      loadingModal = true;
      catalog.setMusicSets(await sheetMusic.listSets());
      loadingModal = false;
    }
  }

  function toggleMusicSet(set: MusicSet) {
    const setId = set.id!;
    selectedMusicSets = selectedMusicSets.includes(setId)
      ? selectedMusicSets.filter((s) => s !== setId)
      : [...selectedMusicSets, setId];
  }

  async function saveMusicSets() {
    sets = await projectsApi.addSets(id, selectedMusicSets);
    addMusicSetModalIsOpen = false;
    selectedMusicSets = [];
  }

  async function removeMusicSet(set: MusicSet) {
    const result = await projectsApi.removeSets(id, [set.id!]);
    if (result.status === 200) {
      sets = sets.filter((s) => s.id !== set.id);
    }
  }
</script>

<Breadcrumb
  class="mb-6"
  items={[
    { label: "Prosjekter", href: "/projects" },
    { label: project.name ?? "-" },
  ]}
/>

{#if loading}
  <LoadingSpinner />
{:else}
  <div
    class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-3">
      <h1 class="text-3xl font-semibold">{project.name}</h1>
      <Button color="alternative" size="sm">
        Handlinger<ChevronDownOutline class="ms-2 h-4 w-4" />
      </Button>
      <Dropdown simple>
        <DropdownItem onclick={() => (editProjectModalIsOpen = true)}>
          Rediger
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem onclick={() => (confirmDeleteOpen = true)}
          >Slett</DropdownItem
        >
      </Dropdown>
    </div>
    <FancyDateView fromDate={project.startDate} toDate={project.endDate} />
  </div>

  <div class="mb-4 flex items-center justify-between">
    <h4 class="text-xl font-medium">Tilknyttede notesett</h4>
    <Button size="sm" onclick={openAddSetModal}>+ Legg til notesett</Button>
  </div>

  {#if !sets || sets.length < 1}
    <Alert color="blue">
      <span class="font-medium">🤔 Fant ingen notesett!</span>
      Det er ingen tilknyttede notesett på dette prosjektet enda.
    </Alert>
  {:else}
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each sets as set (set.id)}
        <Card class="relative w-full max-w-none p-4">
          <button
            type="button"
            class="absolute top-3 right-3 text-red-500 hover:text-red-400"
            aria-label="Fjern notesett"
            onclick={() => removeMusicSet(set)}
          >
            <TrashBinOutline />
          </button>
          <h4 class="mb-1 text-lg font-semibold text-white">{set.title}</h4>
          <h6 class="mb-3 text-sm text-gray-400">
            {set.composer ?? "-"}
            {#if set.arranger}, Arr: {set.arranger}{/if}
          </h6>
          <a
            href={`/set/edit/${set.id}`}
            class="text-primary-500 mt-auto hover:underline"
          >
            Se notesett
          </a>
        </Card>
      {/each}
    </div>
  {/if}
{/if}

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Ønsker du å slette prosjektet?"
  description="Handlingen kan ikke reverseres!"
  onconfirm={removeProject}
/>

<Modal title="Rediger prosjekt" bind:open={editProjectModalIsOpen} size="sm">
  <ProjectModalBody {project} />
  {#snippet footer()}
    <Button disabled={isSavingProject} onclick={saveProject}>Lagre</Button>
    <Button
      color="alternative"
      onclick={() => (editProjectModalIsOpen = false)}
    >
      Lukk
    </Button>
  {/snippet}
</Modal>

<Modal title="Legg til notesett" bind:open={addMusicSetModalIsOpen} size="lg">
  {#if loadingModal}
    <LoadingSpinner inline={true} />
  {:else}
    <Search bind:value={searchTerm} placeholder="Søk" class="mb-3" />
    <div
      class="grid grid-cols-3 gap-2 px-3 pb-2 text-sm font-semibold text-gray-400"
    >
      <span>Tittel</span>
      <span>Komponist</span>
      <span>Arrangør</span>
    </div>
    <div class="max-h-[500px] divide-y divide-gray-700 overflow-y-auto">
      {#each filteredMusicSets as item (item.id)}
        <button
          type="button"
          class="grid w-full cursor-pointer grid-cols-3 gap-2 px-3 py-2 text-left hover:bg-gray-700 {selectedMusicSets.includes(
            item.id!,
          )
            ? 'bg-primary-700'
            : ''}"
          onclick={() => toggleMusicSet(item)}
        >
          <span>{item.title ?? "-"}</span>
          <span>{item.composer ?? "-"}</span>
          <span>{item.arranger ?? "-"}</span>
        </button>
      {/each}
    </div>
  {/if}
  {#snippet footer()}
    <Button onclick={saveMusicSets}>Lagre</Button>
    <Button
      color="alternative"
      onclick={() => (addMusicSetModalIsOpen = false)}
    >
      Lukk
    </Button>
  {/snippet}
</Modal>
