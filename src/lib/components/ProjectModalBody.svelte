<script module lang="ts">
  import type { Project } from "$lib/types";
  import { endsBeforeStart } from "$lib/utils/date";

  /**
   * Whether the form holds a project worth sending. Lives with the form so the
   * rule and the messages explaining it can't drift apart: both dialogs disable
   * their save button on this, and the fields below each say which part of it
   * they are failing.
   */
  export function isProjectDraftValid(project: Partial<Project>): boolean {
    return (
      !!project.name?.trim() &&
      !!project.startDate &&
      !!project.endDate &&
      !endsBeforeStart(project)
    );
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { Label, Input, Datepicker, Helper } from "flowbite-svelte";

  // `project` is mutated in place; the parent owns the reactive object.
  // The description (`comments`) is opt-in: the create endpoint doesn't accept
  // it, so only the edit dialog shows the field. `autofocusDescription` lands
  // the caret there for the "Rediger" shortcut on the description card.
  let {
    project,
    withDescription = false,
    autofocusDescription = false,
  }: {
    project: Partial<Project>;
    withDescription?: boolean;
    autofocusDescription?: boolean;
  } = $props();

  /** Advisory length guideline for the description, shown as a counter. */
  const DESCRIPTION_MAX_LENGTH = 800;

  let startDate = $state<Date | undefined>();
  let endDate = $state<Date | undefined>();
  let descriptionLength = $derived((project.comments ?? "").length);

  // Read off `project` rather than the pickers' own state, so these say the same
  // thing as the `isProjectDraftValid` the save button is disabled on.
  let nameMissing = $derived(!project.name?.trim());
  let startDateMissing = $derived(!project.startDate);
  let endDateMissing = $derived(!project.endDate);
  let datesReversed = $derived(endsBeforeStart(project));

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
    {#if nameMissing}
      <Helper class="mt-2" color="red">Prosjektnavn er påkrevd.</Helper>
    {/if}
  </div>
  <div>
    <div class="dates">
      <div>
        <Label class="mb-2">Startdato</Label>
        <Datepicker bind:value={startDate} locale="nb-NO" inline />
        {#if startDateMissing}
          <Helper class="mt-2" color="red">Startdato er påkrevd.</Helper>
        {/if}
      </div>
      <div>
        <Label class="mb-2">Sluttdato</Label>
        <Datepicker bind:value={endDate} locale="nb-NO" inline />
        {#if endDateMissing}
          <Helper class="mt-2" color="red">Sluttdato er påkrevd.</Helper>
        {/if}
      </div>
    </div>
    {#if datesReversed}
      <Helper class="mt-2" color="red">
        Sluttdato kan ikke være før startdato.
      </Helper>
    {/if}
  </div>
  {#if withDescription}
    <div>
      <Label for="projectDescription" class="mb-2">Beskrivelse</Label>
      <textarea
        id="projectDescription"
        class="description"
        data-autofocus={autofocusDescription ? "" : undefined}
        placeholder="Praktisk informasjon musikerne trenger — oppmøte, antrekk, hva de skal ta med, hvem de kan kontakte…"
        value={project.comments ?? ""}
        oninput={(e) => (project.comments = e.currentTarget.value)}
      ></textarea>
      <div class="hint">
        <span>Vises for alle musikerne på prosjektsiden.</span>
        <span
          class="count"
          class:over={descriptionLength > DESCRIPTION_MAX_LENGTH}
        >
          {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
        </span>
      </div>
    </div>
  {/if}
</form>

<style>
  /* Two inline calendars side by side on desktop, stacked on mobile. */
  .dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .description {
    width: 100%;
    min-height: 132px;
    padding: 12px 14px;
    font-family: var(--font-text);
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    resize: vertical;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .description:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
  }
  .hint {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 6px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-muted);
  }
  .count {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 11.5px;
  }
  .count.over {
    color: var(--danger);
  }

  @media (max-width: 640px) {
    .dates {
      grid-template-columns: 1fr;
    }
    /* 16px keeps iOS from zooming in when the field takes focus. */
    .description {
      font-size: 16px;
    }
  }
</style>
