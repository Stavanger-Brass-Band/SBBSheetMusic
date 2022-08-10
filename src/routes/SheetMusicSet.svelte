<script>
  import { onMount } from "svelte";
  import auth from "../authentication.js";
  import Header from "../components/Header.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import Icon from "fa-svelte";
  import * as Api from "../api.js";
  import {
    faCloudDownloadAlt,
    faChevronLeft,
    faHeadphones,
    faSpinner
  } from "@fortawesome/free-solid-svg-icons";

  export let params = {};

  let set = {};
  let project = {};
  let selectedPartForDownload = {};
  let loading = true;

  onMount(async () => {
    set = await Api.get(`/sheetmusic/sets/${params.id}/parts`);
    project = await Api.get(`/projects/${params.projectId}`);
    loading = false;
  });

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

  async function downloadPart(part) {
    if (selectedPartForDownload === part) return;
    selectedPartForDownload = part;

    const downloadToken = await Api.get(
      `/sheetmusic/sets/${params.id}/zip/token`,
      "text"
    );

    if (downloadToken) {
      const blob = await Api.get(
        `/sheetmusic/sets/${params.id}/parts/${part.name}/pdf?downloadToken=${downloadToken}`,
        "blob"
      );

      showPdf(blob);
    }
  }

  function getPartImageUrl(part) {
    const name = part.name;
    let partImageUrl = "img/";
    switch (true) {
      case name.toLowerCase().indexOf("ess kornett") != -1 ||
        name.toLowerCase().indexOf("esskornett") != -1 ||
        name.toLowerCase().indexOf("sopran") != -1:
        partImageUrl += "EbCornet.jpg";
        break;
      case name.toLowerCase().indexOf("kornett") != -1 ||
        name.toLowerCase().indexOf("repiano") != -1:
        partImageUrl += "BbCornet.jpg";
        break;
      case name.toLowerCase().indexOf("flygelhorn") != -1:
        partImageUrl += "Flugelhorn.jpg";
        break;
      case name.toLowerCase().indexOf("horn") != -1:
        partImageUrl += "EbHorn.jpg";
        break;
      case name.toLowerCase().indexOf("baryton") != -1:
        partImageUrl += "Baryton.jpg";
        break;
      case name.toLowerCase().indexOf("trombone") != -1:
        partImageUrl += "Trombone.jpg";
        break;
      case name.toLowerCase().indexOf("euphonium") != -1:
        partImageUrl += "Euphonium.jpg";
        break;
      case name.toLowerCase().indexOf("tuba") != -1:
        partImageUrl += "Tuba.jpg";
        break;
      case name.toLowerCase().indexOf("percussion") != -1 ||
        name.toLowerCase().indexOf("klokkespill") != -1 ||
        name.toLowerCase().indexOf("melodisk") != -1 ||
        name.toLowerCase().indexOf("timpani") != -1:
        partImageUrl += "Drums.jpg";
        break;
      case name.toLowerCase().indexOf("partitur") != -1:
        partImageUrl += "dirigent.jpg";
        break;
      default:
        partImageUrl += "music-notes-compressed.jpg";
        break;
    }

    return partImageUrl;
  }
</script>

<style>
  .part-grid {
    display: grid;
    grid-template-columns: repeat(3, calc(33% - 10px));
    grid-gap: 20px;
    margin-top: 20px;
  }

  @media screen and (max-width: 992px) {
    .part-grid {
      grid-template-columns: repeat(2, calc(50% - 10px));
    }
  }

  @media screen and (max-width: 575px) {
    .part-grid {
      grid-template-columns: repeat(1, 100%);
    }
  }

  .grid-item {
    background-color: #4e5d6c;
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    font-size: 18px;
    z-index: 1;
    color: #fff;
    cursor: pointer;
    position: relative;
  }

  .grid-item:hover {
    text-decoration: none;
    background-color: rgba(255, 255, 255, 0.4);
  }

  .avatar {
    border-radius: 50%;
    height: 4rem;
    width: 4rem;
    background-color: white;
    margin-right: 1rem;
    position: relative;
  }

  .avatar img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-height: 3.5rem;
    max-width: 3.5rem;
    border-radius: 50%;
  }

  .download {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  .icon-link {
    display: inline-flex;
    align-items: center;
  }
</style>

<ol class="breadcrumb mb-4">
  <li class="breadcrumb-item">
    <a href="/#">Hjem</a>
  </li>
  <li class="breadcrumb-item">
    <a href="{'#/project/' + project.id}">{project.name ? project.name : ''}</a>
  </li>
  <li class="breadcrumb-item active">{set.title ? set.title : ''}</li>
</ol>
{#if loading}
  <LoadingSpinner />
{:else}
  <h1>
    {set.title ? set.title : ''}
    <p class="lead">
      {#if set.composer}{set.composer}{/if}
      {#if set.composer && set.arranger},{/if}
      {#if set.arranger}Arr. {set.arranger}{/if}
    </p>
  </h1>

  {#if set.recordingUrl}
    <a href={set.recordingUrl} target="_blank" class="icon-link">
      <Icon icon={faHeadphones} class="mr-1" />
      Åpne lytteeksempel
    </a>
  {/if}

  <h4 class="mt-4">Last ned noter</h4>

  <div class="part-grid">
    {#if set.parts && set.parts.length > 0}
      {#each set.parts as part}
        <div
          class="grid-item"
          on:click|preventDefault={() => downloadPart(part)}>
          <div class="avatar">
            <img src={getPartImageUrl(part)} alt="" />
          </div>
          {part.name}
          <div class="download">
            {#if selectedPartForDownload === part}
              <div class="spinner-border text-info" role="status">
                <span class="sr-only">Loading...</span>
              </div>
            {:else}
              <Icon icon={faCloudDownloadAlt} />
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <em>Notene til dette settet har enda ikke blitt scannet</em>
    {/if}
  </div>
{/if}
