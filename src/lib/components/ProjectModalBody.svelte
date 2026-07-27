<script lang="ts">
  import { onMount } from "svelte";
  import { Label, Input, Datepicker } from "flowbite-svelte";
  import type { Project } from "$lib/types";

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
  <div class="dates">
    <div>
      <Label class="mb-2">Startdato</Label>
      <Datepicker bind:value={startDate} locale="nb-NO" inline />
    </div>
    <div>
      <Label class="mb-2">Sluttdato</Label>
      <Datepicker bind:value={endDate} locale="nb-NO" inline />
    </div>
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
