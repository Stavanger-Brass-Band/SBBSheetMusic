<script>
  import { onMount } from "svelte";
  import { activeProjects } from "../store.js";
  import * as Api from "../api.js";
  import moment from "moment";

  import FancyDateView from "../components/FancyDateView.svelte";
  import LoadingSpinner from "../components/LoadingSpinner.svelte";
  import Icon from "fa-svelte";
  import { faArrowRight, faFolder, faFolderOpen } from "@fortawesome/free-solid-svg-icons";

  let loading;

  onMount(async () => {
    if ($activeProjects.length < 1) {
      loading = true;
    }

    let data = await Api.get(`/projects`);

    data = data.filter(
      (project) =>
        moment(project.startDate).isSameOrBefore(moment(), "day") &&
        moment(project.endDate).isSameOrAfter(moment(), "day")
    );

    data.sort(
      (a, b) => moment(a.startDate).valueOf() - moment(b.startDate).valueOf()
    );


    if ($activeProjects !== data) {
      $activeProjects = data;
    }

    loading = false;
  });
</script>

<style>
  h2 {
    margin-bottom: 30px;
  }

  .blockquote {
    margin-bottom: 40px;
  }

  .blockquote .blockquote-footer {
    margin-top: 10px;
  }

  .project-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 100ms ease-out;
    color:white;
    text-align: center;
  }

  .project-card > .title{
    height:60px;
    display: flex;
    align-items:center;
  }

  .folder-icon {
    font-size: 50px;
  }

  .folder-closed{
    display:block;
  }

  .folder-open{
    display: none;
  }

  .project-card:hover {
    cursor: pointer;
    border-color: #df691a;
    box-shadow: 0px 0px 8px 2px #df691a;
    text-decoration: none;
  }

  .project-card:hover > .title{
    text-decoration: underline;
  }

  .project-card:hover > .folder-closed{
    display: none;
  }

  .project-card:hover > .folder-open{
    display: block;
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
  <h2>Aktive prosjekt</h2>
  <div class="row">
    {#each $activeProjects as project}
      <div class="col-lg-3 col-md-4 col-12">
        <a class="project-card mb-4" href={'#/project/' + project.id}>
          <div class="folder-icon folder-closed">
            <Icon class="text-primary" icon="{faFolder}" />
          </div>
          <div class="folder-icon folder-open">
            <Icon class="text-primary" icon="{faFolderOpen}" />
          </div>
          <h5 class="title">{project.name}</h5>
          <FancyDateView
            fromDate="{project.startDate}"
            toDate="{project.endDate}" />
        </a>
      </div>
    {/each}
  </div>
{/if}
