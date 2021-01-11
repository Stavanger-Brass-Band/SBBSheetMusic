<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { get } from "svelte/store";
  import { isAdmin } from "../store";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import * as Api from "../api";

  let users = [];
  let loading = true;

  onMount(async function() {
    if (!get(isAdmin)) {
      push("/");
    }

    users = await Api.get("/users");
    loading = false;
  });

  async function saveNewUser() {
    throw new Error("Not Implemented");
    // var result = await Api.post("/users", newProject);
    // if (result) {
    //   projects = [...projects, result];
    //   window.$("#newProjectModal").modal("hide");
    // }
  }

  window.$("#newUserModal").on("hidden.bs.modal", function(e) {
    newProject = {};
  });

  function openModal() {
    window.$("#newUserModal").modal("show");
  }
</script>

<style>
  .page-header > button.btn-link {
    float: right;
    margin-top: 8px;
  }
</style>

<h1 class="page-header">
  Brukere
  <button type="button" class="btn btn-link right" on:click={openModal}>
    + Legg til bruker
  </button>
</h1>

<table class="table table-striped table-hover table-borderless">
  <thead>
    <tr>
      <th scope="col">Navn</th>
      <th scope="col">E-post</th>
      <th scope="col">Inaktiv</th>
    </tr>
  </thead>
  <tbody>
    {#each users as user}
      <tr on:click={() => push('/user/' + user.id)} class="clickable">
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.inactive}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#if loading}
  <LoadingSpinner />
{/if}

<!--New user modal-->
<!-- <div
  class="modal fade"
  id="newProjectModal"
  tabindex="-1"
  role="dialog"
  aria-labelledby="newProjectModalLabel"
  aria-hidden="true">
  <div class="modal-dialog modal-sm" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="newProjectModalLabel">Nytt prosjekt</h5>
        <button
          type="button"
          class="close"
          data-dismiss="modal"
          aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <form>
          <div class="form-group">
            <label for="projectName">Prosjektnavn</label>
            <input
              type="text"
              class="form-control"
              id="projectName"
              bind:value={newProject.name}
              placeholder="Skriv her" />
          </div>
          <div class="form-group">
            <label for="startDate">Startdato</label>
            <Datepicker
              style="display:block; width:100%"
              format={date => moment(date).format('DD.MM.YYYY')}
              bind:selected={newProject.startDate}
              bind:formattedSelected={formattedStartDate}>
              <button class="form-control text-left">
                {#if newProject.startDate}
                  {formattedStartDate}
                {:else}Velg dato{/if}
              </button>
            </Datepicker>
          </div>
          <div class="form-group">
            <label for="endDate">Sluttdato</label>
            <Datepicker
              style="display:block; width:100%"
              format={date => moment(date).format('DD.MM.YYYY')}
              bind:selected={newProject.endDate}
              bind:formattedSelected={formattedEndDate}>
              <button class="form-control text-left">
                {#if newProject.endDate}{formattedEndDate}{:else}Velg dato{/if}
              </button>
            </Datepicker>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" on:click={saveNewProject}>
          Lagre
        </button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">
          Lukk
        </button>
      </div>
    </div>
  </div>
</div> -->
