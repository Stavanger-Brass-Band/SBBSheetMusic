<script lang="ts">
  import { FileText, Info, Pencil, Plus } from "@lucide/svelte";
  import { Button } from "$lib/components/ui";

  // The project description (the API's `comments` field): practical information
  // the members need — where to meet, what to wear, what to bring. Read-only by
  // default; pass `onedit` to get the admin affordances (a "Rediger" link, and
  // an invitation to write one while the project has none).
  let {
    description,
    onedit,
    class: className = "",
  }: {
    description?: string | null;
    onedit?: () => void;
    class?: string;
  } = $props();

  let text = $derived(description?.trim() ?? "");
  let expanded = $state(false);
  let textElement = $state<HTMLDivElement | undefined>();
  let isClamped = $state(false);

  // A "vis mer" toggle only belongs here when the clamp actually cuts the text
  // off, so measure the rendered block instead of guessing from its length.
  function measureClamp() {
    if (!textElement || expanded) return;
    isClamped = textElement.scrollHeight > textElement.clientHeight + 1;
  }

  $effect(() => {
    if (text) measureClamp();
  });
</script>

<svelte:window onresize={measureClamp} />

{#if text}
  <section class="about {className}">
    <div class="about__top">
      <h2 class="about__label"><Info size={13} /> Om prosjektet</h2>
      {#if onedit}
        <button class="about__edit" onclick={onedit}>
          <Pencil size={14} /> Rediger
        </button>
      {/if}
    </div>
    <div class="about__text" class:clamped={!expanded} bind:this={textElement}>
      {text}
    </div>
    {#if isClamped}
      <button
        class="about__more"
        aria-expanded={expanded}
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? "Vis mindre" : "Vis mer"}
      </button>
    {/if}
  </section>
{:else if onedit}
  <section class="about about--empty {className}">
    <span class="ic"><FileText size={22} strokeWidth={1.9} /></span>
    <span class="txt">
      <b>Ingen beskrivelse enda</b>
      Legg til praktisk informasjon musikerne trenger — oppmøte, antrekk og hva de
      skal ta med.
    </span>
    <Button variant="secondary" size="sm" onclick={onedit}>
      <Plus size={15} /> <span class="addlabel">Legg til beskrivelse</span>
    </Button>
  </section>
{/if}

<style>
  .about {
    max-width: 760px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 16px 18px 14px;
  }
  .about__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }
  .about__label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--text-muted);
  }
  .about__edit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--accent);
    background: none;
    border: none;
    padding: 4px 2px;
    cursor: pointer;
  }
  .about__edit:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .about__text {
    font-size: 15px;
    line-height: 1.62;
    color: var(--text-secondary);
    /* The description is written as paragraphs in a textarea — keep the breaks. */
    white-space: pre-line;
    text-wrap: pretty;
  }
  .about__text.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .about__more {
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--accent);
    background: none;
    border: none;
    padding: 8px 0 0;
    cursor: pointer;
  }
  .about__more:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .about--empty {
    display: flex;
    align-items: center;
    gap: 14px;
    background: transparent;
    border: 1.5px dashed var(--border-strong);
  }
  .about--empty .ic {
    display: inline-flex;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .about--empty .txt {
    flex: 1;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .about--empty .txt b {
    display: block;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }

  @media (max-width: 640px) {
    .about {
      padding: 14px 15px 12px;
    }
    .about__text {
      font-size: 14px;
      line-height: 1.6;
    }
    .about__text.clamped {
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }
    .about--empty {
      gap: 12px;
    }
    /* Phones: the invitation collapses to an icon-only "add" button. */
    .addlabel {
      display: none;
    }
  }
</style>
