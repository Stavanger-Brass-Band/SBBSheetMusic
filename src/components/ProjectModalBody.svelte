<script>
  import { DatePicker } from "@svelte-plugins/datepicker";
  import moment from "moment";

  export let project;

  let startDate = new Date();
  let endDate = new Date();

  if (project.startDate) startDate = new Date(project.startDate);
  if (project.endDate) endDate = new Date(project.endDate);

  let isStartOpen = false;
  let isEndOpen = false;

  const toggleStartDate = () => (isStartOpen = !isStartOpen);
  const toggleEndDate = () => (isEndOpen = !isEndOpen);

  const formatStartDate = (dateString) => {
    project.startDate = moment(dateString).toDate();
    return dateString && moment(dateString).format('DD.MM.YYYY') || '';
  };

  const formatEndDate = (dateString) => {
    project.endDate = moment(dateString).toDate();
    return dateString && moment(dateString).format('DD.MM.YYYY') || '';
  };

  $: formattedStartDate = formatStartDate(startDate);
  $: formattedEndDate = formatEndDate(endDate);
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
      <DatePicker bind:isOpen={isStartOpen} bind:startDate enableFutureDates >
        <input class="form-control" type="text" bind:value={formattedStartDate} on:click={toggleStartDate} />
      </DatePicker>
    </div>
    <div class="form-group">
      <label for="endDate" style="width:100%">Sluttdato</label>
      <DatePicker bind:isOpen={isEndOpen} bind:startDate={endDate} enableFutureDates>
        <input class="form-control" type="text" bind:value={formattedEndDate} on:click={toggleEndDate} />
      </DatePicker>
    </div>
  </form>
</div>
