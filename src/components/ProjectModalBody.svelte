<script>
  import { Datepicker } from "svelte-calendar";
  import moment from "moment";

  export let project;

  if (project.startDate) project.startDate = new Date(project.startDate);
  if (project.endDate) project.endDate = new Date(project.endDate);
  let formattedStartDate = "";
  let formattedEndDate = "";

  let minDate = moment()
    .subtract(1, "year")
    .toDate();

  let maxDate = moment()
    .add(3, "year")
    .toDate();

  let format = "DD.MM.YYYY";
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
      <label for="startDate" style="width:100%">Startdato</label>
      <Datepicker
        format={format}
        start={minDate}
        end={maxDate}
        startOfWeekIndex={1}
        let:key 
        let:send 
        let:receive
        bind:selected={project.startDate}
        bind:formatted={formattedStartDate}>
          <button class="form-control" in:receive|local={{ key }} out:send|local={{ key }}>
            {#if formattedStartDate}
              {formattedStartDate}
            {:else}
              Velg dato
            {/if}
          </button>
      </Datepicker>
    </div>
    <div class="form-group">
      <label for="endDate" style="width:100%">Sluttdato</label>
      <Datepicker
        format={format}
        start={minDate}
        end={maxDate}
        startOfWeekIndex={1}
        let:key 
        let:send 
        let:receive
        bind:selected={project.endDate}
        bind:formatted={formattedEndDate}>
          <button class="form-control w-100 d-block" in:receive|local={{ key }} out:send|local={{ key }}>
            {#if formattedEndDate}
              {formattedEndDate}
            {:else}
              Velg dato
            {/if}
          </button>
      </Datepicker>
    </div>
  </form>
</div>
