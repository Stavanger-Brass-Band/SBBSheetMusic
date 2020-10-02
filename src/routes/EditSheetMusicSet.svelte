<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import * as Api from "../api";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import Modal from "sv-bootstrap-modal";
  import MusicSetModalBody from "../components/MusicSetModalBody.svelte";
  import Icon from "fa-svelte";
  import {
    faTrash,
    faCloudDownloadAlt,
    faExclamationTriangle,
    faCheckCircle,
    faEdit,
    faHeadphones,
    faStickyNote
  } from "@fortawesome/free-solid-svg-icons";

  export let params = {};

  let set = {};
  let loading = true;
  let uploadComplete = false;
  let files = [];
  let partSelectData = [];
  let isUploading = false;
  let selectedPartForDownload = {};
  let editSetModalIsOpen = false;
  var savingSet = false;

  const headers = {
    Authorization: "Bearer " + localStorage.getItem("access_token")
  };

  onMount(async () => {
    let result = await Api.get(`/sheetmusic/sets/${params.id}/parts`);
    set = result;

    result = await Api.get(`/parts`);

    result.sort((a, b) => a.sortOrder - b.sortOrder);

    partSelectData = result;
    loading = false;
  });

  async function reloadParts() {
    let result = await Api.get(`/sheetmusic/sets/${params.id}/parts`);
    set.parts = [...result.parts];
  }

  async function removeSet() {
    let result = await Api.deleteSingle(`/sheetmusic/sets/${params.id}`);
    if (result.status === 200) {
      push("/archive");
    } else {
    }
  }

  function editSet() {
    editSetModalIsOpen = true;
  }

  async function removePart(part) {
    let result = await Api.deleteSingle(
      `/sheetmusic/sets/${params.id}/parts/${part.musicPartId}`
    );

    if (result.status === 204) {
      const index = set.parts.indexOf(part);

      set.parts.splice(index, 1);
      set.parts = [...set.parts];
    }
  }

  async function onFileSelected() {
    uploadComplete = false;
    isUploading = true;
    let fetchUrls = [];

    for (let i = 0; i < files.length; i++) {
      files[i].isCheckingStatus = true;
      fetchUrls.push(
        `/parts/index?searchTerm=${files[i].name
          .replace(set.title, "")
          .replace(".pdf", "")}`
      );
    }

    let result = await Api.getMultiple(fetchUrls);

    for (let i = 0; i < result.length; i++) {
      files[i].isCheckingStatus = false;
      files[i].suggestedPart = result[i];
    }

    isUploading = false;
  }

  async function uploadFiles() {
    isUploading = true;
    for (let i = 0; i < files.length; i++) {
      if (!files[i].suggestedPart.name) continue;

      var result = await Api.postFile(
        `/sheetmusic/sets/${params.id}/parts/${files[i].suggestedPart.name}/content`,
        files[i]
      );

      if (result.success) {
        files[i].uploadSuccess = true;
      } else if (result.Status === 409) {
        files[i].uploadErrorMessage =
          "Stemmen eksiterer allerede på notesettet";
      }
    }

    isUploading = false;
    uploadComplete = true;
    reloadParts();
  }

  function showPdf(blob) {
    const newBlob = new Blob([blob], { type: "application/pdf" });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(newBlob);
      return;
    }

    const data = window.URL.createObjectURL(newBlob);
    let link = document.createElement("a");
    link.href = data;
    link.download = `${set.title} - ${selectedPartForDownload.name}.pdf`;
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(data);
    }, 100);
    selectedPartForDownload = {};
  }

  function downloadPart(part) {
    if (selectedPartForDownload === part) return;
    selectedPartForDownload = part;
    fetch(
      `https://sheetmusic-api.azurewebsites.net/sheetmusic/sets/${params.id}/zip/token`,
      { headers: headers }
    )
      .then(result => {
        return result.text();
      })
      .then(response => {
        fetch(
          `https://sheetmusic-api.azurewebsites.net/sheetmusic/sets/${params.id}/parts/${part.name}/pdf?downloadToken=${response}`,
          { headers: headers }
        )
          .then(result => {
            return result.blob();
          })
          .then(showPdf);
      });
  }

  async function download(id, url) {
    let result = await fetch(`${Api.baseUrl}/sheetmusic/sets/${id}/zip/token`, {
      headers: headers
    });
    var body = await result.text();
    window.location.assign(url + "?downloadToken=" + body);
  }

  function setSuggestedPart(file, partId) {
    const part = partSelectData.find(o => o.id === partId);
    file.suggestedPart = part;
  }

  async function saveSet() {
    savingSet = true;
    var result = await Api.put(`/sheetMusic/sets/${set.id}`, set);
    savingSet = false;
    if (result) {
      editSetModalIsOpen = false;
      set.title = result.title;
      set.arranger = result.arranger;
      set.composer = result.composer;
      set.archiveNumber = result.archiveNumber;
    }
  }

  var missingPartsTimeout, recordingUrlTimeout;

  async function saveMissingParts(event) {
    if (missingPartsTimeout) {
      clearTimeout(missingPartsTimeout);
    }

    missingPartsTimeout = setTimeout(function() {
      saveSet();
    }, 1000);
  }

  async function saveRecordingUrl(event) {
    if (recordingUrlTimeout) {
      clearTimeout(recordingUrlTimeout);
    }

    recordingUrlTimeout = setTimeout(function() {
      saveSet();
    }, 1000);
  }
</script>

<style>
  .input-group-append .loading-container {
    background-color: white;
    border: none;
    margin-left: -1px;
    margin-top: 1px;
    height: 36px;
  }

  .file-list {
    margin-bottom: 16px;
  }
  .file-item {
    position: relative;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  }

  .file-item.has-upload-feedback {
    padding-right: 40px;
  }

  .file-item:last-child {
    border-bottom: 0;
  }

  .file-item-upload-feedback {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
</style>

<ol class="breadcrumb">
  <li class="breadcrumb-item">
    <a href="#/archive">Arkivliste</a>
  </li>
  <li class="breadcrumb-item active">{set.title ? set.title : '-'}</li>
</ol>

{#if loading}
  <LoadingSpinner />
{:else}
  <h1 class="page-header">
    {set.title}
    <div class="dropdown float-right">
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
        {#if set.hasBeenScanned}
          <a
            href="no-ref"
            class="dropdown-item"
            on:click|preventDefault|stopPropagation={async () => await download(set.id, set.zipDownloadUrl)}>
            Last ned alle notene
          </a>
        {/if}
        <a
          class="dropdown-item"
          href="nohref"
          on:click|preventDefault={editSet}>
          Rediger
        </a>
        <div class="dropdown-divider" />
        <a
          class="dropdown-item"
          href="nohref"
          on:click|preventDefault={removeSet}>
          Slett
        </a>
      </div>
    </div>
    <p class="lead">
      {#if set.composer}{set.composer}{/if}
      {#if set.composer && set.arranger},{/if}
      {#if set.arranger}Arr. {set.arranger}{/if}
    </p>
  </h1>

  <div class="row">
    <div class="col-6">
      <h4 class="mb-4">Noter</h4>

      {#if set.parts.length < 1}
        <em>
          Ingen tilknyttede noter til notesettet. Last opp notefiler for å
          knytte dem til notesettet.
        </em>
      {:else}
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Stemme</th>
              <th class="text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {#each set.parts as part}
              <tr>
                <td>{part.name}</td>
                <td class="text-right">
                  <button
                    class="btn btn-sm btn-secondary"
                    on:click|preventDefault={() => downloadPart(part)}>
                    {#if selectedPartForDownload === part}
                      <div
                        class="spinner-border spinner-border-sm text-info"
                        role="status">
                        <span class="sr-only">Loading...</span>
                      </div>
                    {:else}
                      <Icon icon={faCloudDownloadAlt} />
                    {/if}
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    on:click={() => removePart(part)}>
                    <Icon icon={faTrash} />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    <div class="col-5 offset-lg-1">
      <form class="mb-5">
        <fieldset>
          <legend>Settinformasjon</legend>
        </fieldset>
        <div class="form-group">
          <label class="control-label">Manglende noter</label>
          <div class="form-group">
            <div class="input-group mb-3">
              <div class="input-group-prepend">
                <span class="input-group-text">
                  <Icon icon={faStickyNote} />
                </span>
              </div>
              <input
                on:input={saveMissingParts}
                bind:value={set.missingParts}
                type="text"
                id="missingParts"
                class="form-control"
                placeholder="Manglende noter..." />
              {#if savingSet}
                <div class="input-group-append">
                  <span class="input-group-text loading-container">
                    <div
                      class="spinner-border spinner-border-sm text-info"
                      role="status">
                      <span class="sr-only">Loading...</span>
                    </div>
                  </span>
                </div>
              {/if}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="control-label">Lytteeksempel</label>
          <div class="form-group">
            <div class="input-group mb-3">
              <div class="input-group-prepend">
                <span class="input-group-text">
                  <Icon icon={faHeadphones} />
                </span>
              </div>
              <input
                on:input={saveRecordingUrl}
                bind:value={set.recordingUrl}
                type="text"
                id="recordingUrl"
                class="form-control"
                placeholder="Legg inn link til lytteeksempel..." />
              {#if savingSet}
                <div class="input-group-append">
                  <span class="input-group-text loading-container">
                    <div
                      class="spinner-border spinner-border-sm text-info"
                      role="status">
                      <span class="sr-only">Loading...</span>
                    </div>
                  </span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </form>

      <div class="card">
        <h4 class="card-header">Last opp noter</h4>
        <div class="card-body">
          <form
            class="form"
            id="fileUpload"
            on:submit|preventDefault={uploadFiles}>
            <div class="form-group">
              <div class="custom-file">
                <input
                  type="file"
                  multiple
                  class="custom-file-input"
                  id="pdfFileInput"
                  aria-describedby="fileHelp"
                  accept=".pdf"
                  on:change={onFileSelected}
                  bind:files />
                <label class="custom-file-label" for="pdfFileInput">
                  Velg PDF filer
                </label>
              </div>
              <small id="fileHelp" class="form-text text-muted">
                Her velges alle notefilene som skal knyttes til notesettet. Kun
                PDF filer støttes.
              </small>
            </div>

            {#if files.length > 0}
              <legend>
                Valgte filer
                <button
                  class="btn btn-link float-right"
                  on:click|preventDefault={() => {
                    files = [];
                  }}>
                  Nullstill
                </button>
              </legend>
              <div class="file-list">
                {#each files as file}
                  <div
                    class="file-item"
                    class:has-upload-feedback={file.uploadSuccess || isUploading || file.uploadErrorMessage || file.isCheckingStatus}>
                    <div>{file.name}</div>
                    {#if file.suggestedPart && !file.uploadSuccess && !file.uploadErrorMessage}
                      <div class="form-group">
                        {#if file.suggestedPart.name}
                          <label for="partSelect" class="text-success">
                            Stemme valgt. Kontroller før opplasting
                          </label>
                        {:else}
                          <label for="partSelect" class="text-warning">
                            <Icon icon={faExclamationTriangle} />
                            Kunne ikke finne en stemme basert på filnavnet. Velg
                            fra listen
                          </label>
                        {/if}
                        {#if !isUploading && !file.uploadErrorMessage}
                          <select
                            class="form-control"
                            id="partSelect"
                            bind:value={file.suggestedPart.id}
                            on:change={event => setSuggestedPart(file, event.target.value)}>
                            <option value="">Velg en stemme...</option>
                            {#each partSelectData as part}
                              <option value={part.id}>{part.name}</option>
                            {/each}
                          </select>
                        {/if}
                      </div>
                    {/if}
                    {#if file.isCheckingStatus}
                      <small>
                        {#if file.isCheckingStatus}Finner stemme...{/if}
                      </small>
                    {/if}
                    {#if file.uploadSuccess}
                      <small class="text-success">
                        Lastet opp stemme: {file.suggestedPart.name}
                      </small>
                    {/if}
                    {#if file.uploadErrorMessage}
                      <small class="text-danger">
                        {file.uploadErrorMessage}
                      </small>
                    {/if}
                    <div class="file-item-upload-feedback">
                      {#if (isUploading && !file.uploadSuccess && !file.uploadErrorMessage) || file.isCheckingStatus}
                        <div class="spinner-border text-info" role="status">
                          <span class="sr-only">Loading...</span>
                        </div>
                      {:else if file.uploadSuccess}
                        <Icon icon={faCheckCircle} class="text-success" />
                      {:else if file.uploadErrorMessage}
                        <Icon
                          icon={faExclamationTriangle}
                          class="text-danger" />
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>

              {#if !uploadComplete}
                <button
                  type="submit"
                  disabled={isUploading}
                  class="btn btn-primary">
                  Last opp
                </button>
              {/if}
            {/if}
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<Modal bind:open={editSetModalIsOpen} dialogClasses="modal-sm">
  <div class="modal-header">
    <h5 class="modal-title" id="newMusicSetModalLabel">Oppdater notesett</h5>
    <button
      type="button"
      class="close"
      on:click={() => (editSetModalIsOpen = false)}>
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <MusicSetModalBody {set} />
  <div class="modal-footer">
    <button type="button" class="btn btn-primary" on:click={saveSet}>
      Lagre
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => (editSetModalIsOpen = false)}>
      Lukk
    </button>
  </div>
</Modal>
