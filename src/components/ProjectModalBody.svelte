<script>
  import Datepicker from "svelte-calendar";
  import moment from "moment";

  export let project;

  if (project.startDate) project.startDate = new Date(project.startDate);
  if (project.endDate) project.endDate = new Date(project.endDate);
  let formattedStartDate = "";
  let formattedEndDate = "";
</script>

<div class="modal-body">
  <form>
    <div class="form-group">
      <label for="projectName">Prosjektnavn</label>
      <input
        type="text"
        class="form-control"
        id="projectName"
        bind:value={project.name}
        placeholder="Skriv her" />
    </div>
    <div class="form-group">
      <label for="startDate">Startdato</label>
      <Datepicker
        style="display:block; width:100%"
        format={date => moment(date).format('DD.MM.YYYY')}
        bind:selected={project.startDate}
        bind:formattedSelected={formattedStartDate}>
        <button class="form-control text-left">
          {#if project.startDate}{formattedStartDate}{:else}Velg dato{/if}
        </button>
      </Datepicker>
    </div>
    <div class="form-group">
      <label for="endDate">Sluttdato</label>
      <Datepicker
        style="display:block; width:100%"
        format={date => moment(date).format('DD.MM.YYYY')}
        bind:selected={project.endDate}
        bind:formattedSelected={formattedEndDate}>
        <button class="form-control text-left">
          {#if project.endDate}{formattedEndDate}{:else}Velg dato{/if}
        </button>
      </Datepicker>
    </div>
  </form>
</div>
