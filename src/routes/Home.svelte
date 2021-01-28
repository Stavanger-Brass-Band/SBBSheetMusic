<script>
  import auth from "../authentication.js";
  import { get } from "svelte/store";
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";
  import { baseUrl, activeProjects } from "../store.js";
  import * as Api from "../api.js";
  import moment from "moment";

  import Header from "../components/Header.svelte";
  import FancyDateView from "../components/FancyDateView.svelte";
  import MusicSetCard from "../components/MusicSetCard.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";

  let loading;

  onMount(async () => {
    if($activeProjects.length < 1){
      loading = true;
      let data = await Api.get(`/projects`);

      data = data.filter(
      project =>
          moment(project.startDate).isSameOrBefore(moment(), "day") &&
          moment(project.endDate).isSameOrAfter(moment(), "day")
      );

      data.sort(
        (a, b) => moment(a.startDate).valueOf() - moment(b.startDate).valueOf()
      );

      const setsResult = await Api.getMultiple(
        data.map(project => `/projects/${project.id}/sets`)
      );

      for (let i = 0; i < setsResult.length; i++) {
        data[i].sets = setsResult[i];
      }

      $activeProjects = data;
      loading = false;
    }
  });
</script>

<style>
  .project {
    margin-bottom: 30px;
  }

  h2 {
    margin-bottom: 30px;
  }

  .blockquote {
    margin-bottom: 40px;
  }

  .blockquote .blockquote-footer {
    margin-top: 10px;
  }

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

<blockquote class="blockquote text-center">
  <p class="mb-0">
    Velkommen til medlemssiden for Stavanger Brass Band!
    <br />
    Her finner du alle noter tilhørende korpsets aktive prosjekter.
  </p>
  <footer class="blockquote-footer">
    Hilsen SBB
    <cite title="Source Title">Dev Team</cite>
  </footer>
</blockquote>

{#if loading}
  <LoadingSpinner />
{:else}
  {#each $activeProjects as project}
    <div class="project">
      <h2>
        {project.name}
        <div class="dateview-container">
          <FancyDateView
            fromDate={project.startDate}
            toDate={project.endDate} />
        </div>
      </h2>
      <div class="row">
        {#if project.sets.length > 0}
          {#each project.sets as set}
            <div class="col-lg-4 col-6">
              <MusicSetCard {set} />
            </div>
          {/each}
        {:else}
          <div class="col-12">
            <em>Ingen noter tilknyttet prosjektet enda</em>
          </div>
        {/if}
      </div>
    </div>
  {/each}
{/if}
