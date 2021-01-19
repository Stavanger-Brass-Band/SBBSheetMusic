<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { get } from "svelte/store";
  import moment from "moment";
  import Modal from "sv-bootstrap-modal";
  import ProjectModalBody from "../components/ProjectModalBody.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import * as Api from "../api";
  import { isAdmin } from "../store";

  let projects = [];
  let loading = true;

  onMount(async function() {
    if (!get(isAdmin)) {
      push("/");
    }

    projects = await Api.get("/projects");

    if (projects) {
      projects.sort(
        (a, b) => moment(b.startDate).valueOf() - moment(a.startDate).valueOf()
      );
    }

    loading = false;
  });

  let newProject = {};
  let newProjecModalIsOpen = false;
  let isSavingNewProject = false;

  async function saveNewProject() {
    isSavingNewProject = true;
    const postData = {
      name: newProject.name,
      startDate: moment(newProject.startDate)
        .hour(12)
        .utc()
        .format(),
      endDate: moment(newProject.endDate)
        .hour(12)
        .utc()
        .format()
    };

    var result = await Api.post("/projects", postData);
    isSavingNewProject = false;
    if (result) {
      window.$("#newProjectModal").modal("hide");
      push("/project/" + result.id);
    }
  }

  window.$("#newProjectModal").on("hidden.bs.modal", function(e) {
    newProject = {};
  });

  function openModal() {
    newProjecModalIsOpen = true;
  }
</script>

<style>
  .page-header > button.btn-link {
    float: right;
    margin-top: 8px;
  }
</style>

<h1 class="page-header">
  Prosjekter
  <button type="button" class="btn btn-link right" on:click={openModal}>
    + Nytt prosjekt
  </button>
</h1>

<table class="table table-striped table-hover table-borderless">
  <thead>
    <tr>
      <th scope="col">Navn</th>
      <th scope="col">Startdato</th>
      <th scope="col">Sluttdato</th>
    </tr>
  </thead>
  <tbody>
    {#each projects as project}
      <tr on:click={() => push('/project/' + project.id)} class="clickable">
        <td>{project.name}</td>
        <td>{moment(project.startDate).format('DD.MM.YYYY')}</td>
        <td>{moment(project.endDate).format('DD.MM.YYYY')}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if loading}
  <LoadingSpinner />
{/if}

<!--New project modal-->
<Modal bind:open={newProjecModalIsOpen} dialogClasses="modal-sm">
  <div class="modal-header">
    <h5 class="modal-title" id="newProjectModalLabel">Nytt prosjekt</h5>
    <button
      type="button"
      class="close"
      on:click={() => (newProjecModalIsOpen = false)}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <ProjectModalBody project={newProject} />
  <div class="modal-footer">
    <button
      type="button"
      class="btn btn-primary"
      disabled={isSavingNewProject}
      on:click={saveNewProject}>
      Lagre
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => (newProjecModalIsOpen = false)}>
      Lukk
    </button>
  </div>
</Modal>
