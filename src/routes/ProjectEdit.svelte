<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import VirtualList from "@sveltejs/svelte-virtual-list";
  import Header from "../components/Header.svelte";
  import ProjectModalBody from "../components/ProjectModalBody.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import FancyDateView from "../components/FancyDateView.svelte";
  import Modal from "sv-bootstrap-modal";
  import Icon from "fa-svelte";
  import moment from "moment";
  import { Confirm } from 'svelte-confirm'
  import {
    faArrowRight,
    faSearch,
    faTrash
  } from "@fortawesome/free-solid-svg-icons";
  import * as Api from "../api";
  import { musicSets, activeProjects } from "../store.js";

  export let params = {};

  let project = {};
  let sets = [];
  let loading = true;
  let loadingModal = false;
  let editProjectModalIsOpen = false;
  let addMusicSetModalIsOpen = false;
  let selectedMusicSets = [];
  let isSavingProject = false;

  onMount(async () => {
    let data = await Api.getMultiple([
      `/projects/${params.id}`,
      `/projects/${params.id}/sets`
    ]);

    project = data[0];
    sets = data[1];
    loading = false;
  });

  async function saveProject() {
    isSavingProject = true;
    const putData = {
      name: project.name,
      startDate: moment(project.startDate)
        .hour(12)
        .utc()
        .format(),
      endDate: moment(project.endDate)
        .hour(12)
        .utc()
        .format()
    };

    var result = await Api.put(`/projects/${params.id}`, putData);
    isSavingProject = false;
    if (result) {
      editProjectModalIsOpen = false;
      project = result;
    }
  }

  async function removeProject() {
    let result = await Api.deleteSingle(`/projects/${params.id}`);
    if (result.status === 204) {
      push("/projects");
    } else {
    }
  }

  //Music sets related code
  let searchTerm = "";

  $: filteredMusicSets = $musicSets.filter(set => {
    let uppercaseSearchTerm = searchTerm.toUpperCase();
    return (
      (set.title &&
        set.title.toUpperCase().indexOf(uppercaseSearchTerm) !== -1) ||
      (set.composer &&
        set.composer.toUpperCase().indexOf(uppercaseSearchTerm) !== -1) ||
      (set.arranger &&
        set.arranger.toUpperCase().indexOf(uppercaseSearchTerm) !== -1)
    );
  });

  async function openModal() {
    selectedMusicSets = [];
    addMusicSetModalIsOpen = true;

    if($musicSets.length < 1){
      loadingModal = true;
      $musicSets = await Api.get("/sheetmusic/sets");
      loadingModal = false;
    }
  }

  function selectMusicSet(set) {
    const index = selectedMusicSets.indexOf(set.id);

    if (index === -1) {
      selectedMusicSets = [...selectedMusicSets, set.id];
    } else {
      selectedMusicSets.splice(index, 1);
      selectedMusicSets = [...selectedMusicSets];
    }
  }

  async function saveMusicSets() {
    const newSetList = await Api.post(`/projects/${params.id}/sets`, {
      setIdentifiers: selectedMusicSets
    });

    sets = [...newSetList];

    addMusicSetModalIsOpen = false;
    selectedMusicSets = [];
  }

  async function removeMusicSet(set) {
    let result = await Api.deleteSingle(`/projects/${params.id}/sets`, {
      setIdentifiers: [set.id]
    });

    if (result.status === 200) {
      const index = sets.find(x => x.id === set.id);

      sets.splice(index, 1);
      sets = [...sets];
    } 
  }
</script>

<style>
  .music-set-card {
    color: white;
    margin-bottom: 30px;
    height: calc(100% - 30px);
  }

  .music-set-card .card-link {
    margin-top: auto;
    padding: 0 1.25rem 1.25rem 1.25rem;
  }

  .card-action {
    position: absolute;
    right: 16px;
    top: 12px;
    color: #d9534f;
    cursor: pointer;
  }

  .card-action:hover {
    color: #d23430;
  }

  .list-group {
    margin-left: -15px;
    margin-right: -15px;
    margin-bottom: -15px;
  }
</style>

<ol class="breadcrumb">
  <li class="breadcrumb-item">
    <a href="#/projects">Prosjekter</a>
  </li>
  <li class="breadcrumb-item active">{project.name ? project.name : '-'}</li>
</ol>

{#if loading}
  <LoadingSpinner />
{:else}
  <h1 class="page-header">
    {project.name}
    <Confirm confirmTitle="Slett" cancelTitle="Avbryt" let:confirm="{confirmThis}" themeColor={24}>
      <span slot="title">
        Ønsker du å slette prosjektet?
      </span>
      <span slot="description">
        Handlingen kan ikke reverseres!
      </span>
      <div class="dropdown float-right ml-3">
        <button
          class="btn btn-secondary dropdown-toggle"
          type="button"
          id="dropdownMenuButton"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false" />
        <div
          class="dropdown-menu dropdown-menu-right"
          aria-labelledby="dropdownMenuButton">
          <a
            class="dropdown-item"
            href="#"
            on:click|preventDefault={() => (editProjectModalIsOpen = true)}>
            Rediger
          </a>
          <div class="dropdown-divider" />
          <a
            class="dropdown-item"
            href="#"
            on:click|preventDefault={confirmThis(removeProject)}>
            Slett
          </a>
        </div>
      </div>
    </Confirm>
    <div class="float-right">
      <FancyDateView fromDate={project.startDate} toDate={project.endDate} />
    </div>
  </h1>

  <h4 class="mb-4">
    Tilknyttede notesett
    <button class="float-right btn btn-link" on:click={openModal}>
      + Legg til notesett
    </button>
  </h4>
  <div class="row">
    {#each sets as set}
      <div class="col-lg-4 col-md-6">
        <div class="card music-set-card">
          <div class="card-body pb-0">
            <h4 class="card-title">{set.title}</h4>
            <h6 class="card-subtitle mb-3 text-muted">
              {set.composer ? set.composer : '-'}
              {#if set.arranger}, Arr: {set.arranger}{/if}
            </h6>
            <span class="card-action" on:click={() => removeMusicSet(set)}>
              <Icon icon={faTrash} />
            </span>
          </div>
          <a href="#/set/edit/{set.id}" class="card-link">Se notesett</a>
        </div>
      </div>
    {/each}
    {#if !sets || sets.length < 1}
      <div class="col-lg-4 col-md-6">
        <div class="alert alert-info">
          <strong>🤔 Fant ingen notesett!</strong>
          <br />
          Det er ingen tilknyttede notesett på dette prosjektet enda.
        </div>
      </div>
    {/if}
  </div>
{/if}

<Modal bind:open={editProjectModalIsOpen} dialogClasses="modal-sm">
  <div class="modal-header">
    <h5 class="modal-title" id="newProjectModalLabel">Nytt prosjekt</h5>
    <button
      type="button"
      class="close"
      on:click={() => (editProjectModalIsOpen = false)}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <ProjectModalBody {project} />
  <div class="modal-footer">
    {#if isSavingProject}Lagrer...{/if}
    <button
      type="button"
      class="btn btn-primary"
      disabled={isSavingProject}
      on:click={saveProject}>
      Lagre
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => (editProjectModalIsOpen = false)}>
      Lukk
    </button>
  </div>
</Modal>

<!--Add music set modal-->
<Modal bind:open={addMusicSetModalIsOpen} dialogClasses="modal-lg">
  <div class="modal-header">
    <h5 class="modal-title" id="addMusicSetModalLabel">Legg til notesett</h5>
    <button
      type="button"
      class="close"
      on:click={() => (addMusicSetModalIsOpen = false)}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="modal-body">
    {#if loadingModal}
      <LoadingSpinner inline={true} />
    {:else}
      <input
        type="text"
        class="form-control"
        placeholder="Søk"
        bind:value={searchTerm} />
      <ul class="list-group">
        <li class="list-group-item" style="margin-right:16px">
          <div class="row">
            <div class="col-4">
              <strong>Tittel</strong>
            </div>
            <div class="col-4">
              <strong>Komponist</strong>
            </div>
            <div class="col-4">
              <strong>Arrangør</strong>
            </div>
          </div>
        </li>
        <VirtualList height="500px" items={filteredMusicSets} let:item>
          <li
            class:active={selectedMusicSets.indexOf(item.id) !== -1}
            class="clickable list-group-item list-group-item-action"
            on:click={() => selectMusicSet(item)}>
            <div class="row">
              <div class="col-4">{item.title ? item.title : '-'}</div>
              <div class="col-4">{item.composer ? item.composer : '-'}</div>
              <div class="col-4">{item.arranger ? item.arranger : '-'}</div>
            </div>
          </li>
        </VirtualList>
      </ul>
    {/if}
  </div>
  <div class="modal-footer">
    <button type="button" class="btn btn-primary" on:click={saveMusicSets}>
      Lagre
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => (addMusicSetModalIsOpen = false)}>
      Lukk
    </button>
  </div>
</Modal>
