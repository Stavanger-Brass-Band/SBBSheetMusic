<script>
    import { onMount } from "svelte";
    import LoadingSpinner from "../components/LoadingSpinner.svelte";
    import FancyDateView from "../components/FancyDateView.svelte";
    import * as Api from "../api";
    import MusicSetCard from "../components/MusicSetCard.svelte";
  
    export let params = {};
  
    let project = {};
    let loading = true;
  
    onMount(async () => {
      let data = await Api.getMultiple([
        `/projects/${params.id}`,
        `/projects/${params.id}/sets`
      ]);
  
      project = data[0];
      project.sets = data[1];
      loading = false;
    });
  </script>
  
  <style>
    .dateview-container {
        margin-top: 15px;
    }
    @media only screen and (min-width: 600px) {
        .dateview-container {
            float: right;
            margin-top: 0;
        }
    }
  </style>
  
  <ol class="breadcrumb mb-4">
    <li class="breadcrumb-item">
      <a href="#/">Hjem</a>
    </li>
    <li class="breadcrumb-item active">{project.name ? project.name : '-'}</li>
  </ol>
  
  {#if loading}
    <LoadingSpinner />
  {:else}
  <div class="project">
    <h2 class="page-header">
        {project.name}
        <div class="dateview-container">
            <FancyDateView
            fromDate="{project.startDate}"
            toDate="{project.endDate}" />
        </div>
    </h2>
    <div class="row">
    {#if project.sets.length > 0}
        {#each project.sets as set}
        <div class="col-lg-4 col-6">
            <MusicSetCard set="{set}" project={project} />
        </div>
        {/each}
    {:else}
        <div class="col-12">
        <em>Ingen noter tilknyttet prosjektet enda</em>
        </div>
    {/if}
    </div>
</div>
{/if}
  