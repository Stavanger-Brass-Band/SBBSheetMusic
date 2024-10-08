<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import Icon from "fa-svelte";
  import { faSearch, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
  import { get } from "svelte/store";
  import moment from 'moment';

  import { isAdmin, baseUrl, musicSets, lastSetTime } from "../store";
  import Header from "../components/Header.svelte";
  import VirtualList from "@sveltejs/svelte-virtual-list";
  import Modal from "sv-bootstrap-modal";
  import MusicSetModalBody from "../components/MusicSetModalBody.svelte";
  import * as Api from "../api";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";

  let loading = false;
  let searchTerm = "";
  let newSet = {};
  let isOpen = false;

  $: filteredSetList = $musicSets
    ? $musicSets.filter(set => {
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
    if($musicSets.length < 1 || moment().diff($lastSetTime, 'minutes') >= 5){
      loading = true;
      $musicSets = await Api.get("/sheetmusic/sets");
      sortMusicSets();
      loading = false;
    }
  });

  function sortMusicSets(){
    $musicSets.sort((a, b) => {
      if ( a.archiveNumber > b.archiveNumber ){
        return -1;
      }
      if ( a.archiveNumber < b.archiveNumber ){
        return 1;
      }
      return 0;
    });
  }

  async function download(id, url) {
    let downloadToken = await Api.get(
      `/sheetmusic/sets/${id}/zip/token`,
      "text"
    );
    window.location.assign(url + "?downloadToken=" + downloadToken);
  }

  async function saveNewSet() {
    var result = await Api.post("/sheetMusic/sets", newSet);
    if (result) {
      $musicSets.push(result);
      sortMusicSets();
      window.$("#newMusicSetModal").modal("hide");
      push("/set/edit/" + result.id);
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
    position: relative;
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

  .mobile-set-list-header{
    padding-bottom: 8px;
    border-bottom: 2px solid white;
    margin-bottom: 8px;
  }

  .mobile-set-list-item{
    position: relative;
    padding: 10px 48px 10px 0;
  }
  .mobile-set-list-item > * {
    padding:0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-set-list-item > .title{
    font-size: 16px;
    margin-bottom: 0.25rem;
  }
  .mobile-set-list-item > .subtitle{
    font-size:12px;
  }

  .mobile-set-list-item > .action{
    position: absolute;
    right:0;
    top: 12px;
  }

</style>

{#if loading}
  <LoadingSpinner />
{/if}

<h1 class="page-header">
  Arkivliste
  {#if $isAdmin}
  <button type="button" class="btn btn-link right" on:click={openModal}>
    + Nytt notesett
  </button>
  {/if}
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

<div class="set-list-container d-none d-md-block">
  <div class="set-list-header row" >
    <div class="col-1">Nr.</div>
    <div class="col-4">Tittel</div>
    <div class="col-3">Komponist</div>
    <div class="col-3">Arrangør</div>
    <div class="col-1">{#if $isAdmin}Last ned{:else}Digitalt{/if}</div>
  </div>
  <VirtualList itemHeight={45} height="675px" items={filteredSetList} let:item>
    <div
      on:click={() => $isAdmin ? push('/set/edit/' + item.id) : null}
      class="set-list-item row"
      class:clickable={$isAdmin}
      class:even={filteredSetList.indexOf(item) % 2 == 0}>
      
      <div class="col-1">{item.archiveNumber}</div>
      <div class="col-4">{item.title}</div>
      <div class="col-3">{item.composer != null ? item.composer : ''}</div>
      <div class="col-3">{item.arranger != null ? item.arranger : ''}</div>
      <div class="col-1">
      {#if item.hasBeenScanned}
        {#if $isAdmin}
          <a
            href="no-ref"
            on:click|preventDefault|stopPropagation={async () => await download(item.id, item.zipDownloadUrl)}>
            Zip
          </a>
        {:else}
          <Icon icon={faCheckCircle} class="text-success" />
        {/if}
      {/if}
      </div>
      
    </div>
  </VirtualList>
</div>

<div class="mobile-set-list d-block d-md-none">
  <div class="mobile-set-list-header d-flex justify-content-between">
    <strong class="text-left"># - Tittel</strong>
    <strong class="text-right">{#if $isAdmin}Last ned{:else}Scannet{/if}</strong>
  </div>
  <VirtualList itemHeight={66} height="550px" items={filteredSetList} let:item>
    <div
      on:click={() => $isAdmin ? push('/set/edit/' + item.id) : null}
      class="mobile-set-list-item"
      class:clickable={$isAdmin}
      class:even={filteredSetList.indexOf(item) % 2 == 0}>
      <div class="title">{item.archiveNumber} - {item.title}</div>
      <div class="subtitle text-muted">{item.composer != null ? item.composer : ''} {item.composer && item.arranger ? ' - ' : ''} {item.arranger != null ? 'Arr. ' + item.arranger : ''}</div>
      {#if !item.composer && !item.arranger}
        -
      {/if}
      {#if item.hasBeenScanned}
      <div class="action">
        {#if $isAdmin}
          <a
            href="no-ref"
            on:click|preventDefault|stopPropagation={async () => await download(item.id, item.zipDownloadUrl)}>
            Zip
          </a>
        {:else}
          <Icon icon={faCheckCircle} class="text-success" />
        {/if}
        </div>
      {/if}
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
