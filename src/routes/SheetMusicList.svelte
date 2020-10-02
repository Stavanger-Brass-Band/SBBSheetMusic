<script>
  import Header from "../components/Header.svelte";
  import VirtualList from "@sveltejs/svelte-virtual-list";
  import Modal from "sv-bootstrap-modal";
  import MusicSetModalBody from "../components/MusicSetModalBody.svelte";
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import * as Api from "../api";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import Icon from "fa-svelte";
  import { faSearch } from "@fortawesome/free-solid-svg-icons";

  if (
    !localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") === "undefined"
  )
    push("/login");

  const headers = {
    Authorization: "Bearer " + localStorage.getItem("access_token")
  };

  let loading = true;
  let sets = [];
  let searchTerm = "";
  let newSet = {};
  let isOpen = false;

  $: filteredSetList = sets
    ? sets.filter(set => {
        let uppercaseSearchTerm = searchTerm.toUpperCase();
        return (
          set.archiveNumber.toString().indexOf(uppercaseSearchTerm) !== -1 ||
          (set.title &&
            set.title.toUpperCase().indexOf(uppercaseSearchTerm) !== -1) ||
          (set.composer &&
            set.composer.toUpperCase().indexOf(uppercaseSearchTerm) !== -1) ||
          (set.arranger &&
            set.arranger.toUpperCase().indexOf(uppercaseSearchTerm) !== -1)
        );
      })
    : [];

  onMount(async function() {
    sets = await Api.get("/sheetmusic/sets");
    loading = false;
  });

  async function download(id, url) {
    let result = await fetch(`${Api.baseUrl}/sheetmusic/sets/${id}/zip/token`, {
      headers: headers
    });
    var body = await result.text();
    window.location.assign(url + "?downloadToken=" + body);
  }

  async function saveNewSet() {
    var result = await Api.post("/sheetMusic/sets", newSet);
    if (result) {
      window.$("#newMusicSetModal").modal("hide");
      push("/set/" + result.id);
    }
  }

  window.$("#newMusicSetModal").on("hidden.bs.modal", function(e) {
    newSet = {};
  });

  function openModal() {
    isOpen = true;
  }
</script>

<style>
  .page-header {
    margin-bottom: 20px;
  }

  .page-header > button.btn-link {
    float: right;
    margin-top: 8px;
  }

  .set-list-header {
    margin-right: 20px;
    margin-left: 0;
    font-weight: bold;
    font-size: 0.875rem;
  }

  .set-list-header > * {
    padding: 0.75rem;
  }

  .set-list-item {
    margin-left: 0;
    margin-right: 0;
    font-size: 0.875rem;
  }

  .set-list-item:hover,
  .set-list-item.even:hover {
    color: #ebebeb;
    background-color: rgba(255, 255, 255, 0.075);
  }

  .set-list-item > * {
    padding: 0.75rem;
  }
  .set-list-item.even {
    background-color: rgba(255, 255, 255, 0.05);
  }
</style>

{#if loading}
  <LoadingSpinner />
{/if}

<h1 class="page-header">
  Arkivliste
  <button type="button" class="btn btn-link right" on:click={openModal}>
    + Nytt notesett
  </button>
</h1>

<div class="input-group mb-4">
  <div class="input-group-prepend">
    <span class="input-group-text">
      <Icon icon={faSearch} />
    </span>
  </div>
  <input
    type="text"
    class="form-control"
    placeholder="Søk"
    bind:value={searchTerm} />
</div>

<div class="set-list-container">
  <div class="set-list-header row">
    <div class="col-1">Nr.</div>
    <div class="col-4">Tittel</div>
    <div class="col-3">Komponist</div>
    <div class="col-3">Arrangør</div>
    <div class="col-1">Last ned</div>
  </div>
  <VirtualList itemHeight={45} height="675px" items={filteredSetList} let:item>
    <div
      on:click={() => push('/set/' + item.id)}
      class="set-list-item row clickable"
      class:even={filteredSetList.indexOf(item) % 2 == 0}>
      <div class="col-1">{item.archiveNumber}</div>
      <div class="col-4">{item.title}</div>
      <div class="col-3">{item.composer != null ? item.composer : ''}</div>
      <div class="col-3">{item.arranger != null ? item.arranger : ''}</div>
      <div class="col-1">
        {#if item.hasBeenScanned}
          <a
            href="no-ref"
            on:click|preventDefault|stopPropagation={async () => await download(item.id, item.zipDownloadUrl)}>
            Zip
          </a>
        {/if}
      </div>
    </div>
  </VirtualList>
</div>

<Modal bind:open={isOpen} dialogClasses="modal-sm">
  <div class="modal-header">
    <h5 class="modal-title" id="newMusicSetModalLabel">
      Registrer nytt notesett
    </h5>
    <button type="button" class="close" on:click={() => (isOpen = false)}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <MusicSetModalBody set={newSet} />
  <div class="modal-footer">
    <button type="button" class="btn btn-primary" on:click={saveNewSet}>
      Lagre
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => (isOpen = false)}>
      Lukk
    </button>
  </div>
</Modal>
