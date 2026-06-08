<script lang="ts">
  import { onMount } from "svelte";
  import { Label, Input, Datepicker } from "flowbite-svelte";
  import type { Project } from "$lib/types";

  // `project` is mutated in place; the parent owns the reactive object.
  let { project }: { project: Partial<Project> } = $props();

  let startDate = $state<Date | undefined>();
  let endDate = $state<Date | undefined>();

  onMount(() => {
    if (project.startDate) startDate = new Date(project.startDate);
    if (project.endDate) endDate = new Date(project.endDate);
  });

  // Keep the project object in sync as ISO strings; the parent applies the
  // noon-UTC normalization (toApiDate) when saving.
  $effect(() => {
    if (startDate) project.startDate = startDate.toISOString();
  });
  $effect(() => {
    if (endDate) project.endDate = endDate.toISOString();
  });
</script>

<form class="space-y-4">
  <div>
    <Label for="projectName" class="mb-2">Prosjektnavn</Label>
    <Input
      id="projectName"
      value={project.name ?? ""}
      oninput={(e) =>
        (project.name = (e.currentTarget as HTMLInputElement).value)}
      placeholder="Skriv her"
    />
  </div>
  <div>
    <Label class="mb-2">Startdato</Label>
    <Datepicker bind:value={startDate} locale="nb-NO" placeholder="Velg dato" />
  </div>
  <div>
    <Label class="mb-2">Sluttdato</Label>
    <Datepicker bind:value={endDate} locale="nb-NO" placeholder="Velg dato" />
  </div>
</form>
