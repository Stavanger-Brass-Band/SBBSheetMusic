<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { page } from "$app/state";
  import { TriangleAlert, UsersRound } from "@lucide/svelte";
  import { musicians as musiciansApi } from "$lib/api/musicians";
  import { auth } from "$lib/stores/auth.svelte";
  import type { InstrumentGroup, Musician } from "$lib/types";
  import {
    ownSectionIds,
    rosterMemberCount,
    rosterSections,
    seatOf,
    type RosterSection,
  } from "$lib/utils/roster";
  import { cardEnter } from "$lib/utils/motion";
  import { replaceListUrl } from "$lib/utils/listNavigation";
  import { EmptyState } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import RosterCard from "$lib/components/RosterCard.svelte";
  import RosterMemberDialog from "$lib/components/RosterMemberDialog.svelte";

  /**
   * Korpset — the whole band as faces, grouped by section.
   *
   * A viewing page: it shows who plays what and nothing that could be edited
   * from here. Profile pictures are set on a member's own profile and in user
   * administration, which is also the only place the rest of an account is
   * visible — `GET /musicians` is the privacy-reduced read every member gets, so
   * this page has no e-mail, no account state and no sign-in history to leak.
   *
   * The page carries no guard: the endpoint asks only for a session, so the root
   * layout's auth gate is the only condition there is.
   */

  let musicians = $state<Musician[]>([]);
  let loading = $state(true);
  // Kept apart from an empty roster: a band that came back empty and one that
  // never came back read the same on screen otherwise.
  let loadFailed = $state(false);

  let sections = $derived(rosterSections(musicians));
  let memberCount = $derived(rosterMemberCount(sections));

  /**
   * The sections the reader is in, so the page can point them at their own — a
   * grid of thirty faces is somewhere you start by looking for yourself.
   *
   * The canonical order is left alone: `INSTRUMENT_GROUPS` is how a band sits,
   * and reshuffling it per reader would make the same page a different page for
   * everyone. A chip that jumps and a marker on the band do the pointing instead.
   */
  let ownSections = $derived(ownSectionIds(sections, auth.userId));
  /** Where the "Din gruppe" chip goes: the first section the reader sits in. */
  let ownSectionId = $derived(ownSections[0]);

  /**
   * Where each section's cards start in the page-wide count, so the entrance
   * runs as one cascade down the page rather than six restarting at once.
   */
  let sectionCardOffsets = $derived.by(() => {
    let seatsSoFar = 0;
    return sections.map((section) => {
      const offset = seatsSoFar;
      seatsSoFar += section.seats.length;
      return offset;
    });
  });

  let selectedMember = $state<{
    musician: Musician;
    group: InstrumentGroup;
  } | null>(null);
  let isDialogOpen = $state(false);

  function openMember(musician: Musician, group: InstrumentGroup) {
    selectedMember = { musician, group };
    isDialogOpen = true;
  }

  onMount(async () => {
    const loaded = await musiciansApi.list();
    loadFailed = loaded === undefined;
    musicians = loaded ?? [];
    loading = false;
  });

  /**
   * Opening one member straight from a link — what Quick jump's Korpset rows lead
   * to (`/roster?member=<id>`).
   *
   * The parameter is an instruction, not state: it is consumed the moment it is
   * acted on, which is also what keeps this effect from re-firing. Leaving it in
   * the URL would reopen the dialog every time the reader closed it. A member the
   * roster can't seat opens nothing — and still clears the parameter, so a stale
   * link doesn't sit in the address bar pointing at nobody.
   */
  $effect(() => {
    const requested = page.url.searchParams.get("member");
    if (!requested || !sections.length) return;

    const seat = seatOf(sections, requested);
    if (seat) openMember(seat.musician, seat.group);
    replaceListUrl([], page.url.pathname);
  });
</script>

{#snippet sectionBand(section: RosterSection)}
  <!-- A quiet label line rather than a heading that competes with the faces: the
       cards are what the page is, and six loud section titles would break it into
       six pages. -->
  <div class="band">
    <h2>{section.group}</h2>
    {#if ownSections.includes(section.id)}
      <span class="band__you">Din gruppe</span>
    {/if}
    <span class="rule"></span>
    <span class="count">{section.seats.length}</span>
  </div>
{/snippet}

<div class="intro">
  <div>
    <h1 class="sbb-h1">Korpset</h1>
    <p>Alle som spiller i Stavanger Brass Band.</p>
  </div>
  {#if sections.length}
    <div class="tally">
      <div>
        <b>{memberCount}</b>
        <span>Medlemmer</span>
      </div>
      <div>
        <b>{sections.length}</b>
        <span>Grupper</span>
      </div>
    </div>
  {/if}
</div>

{#if loading}
  <LoadingSpinner label="Laster korpset…" />
{:else if loadFailed}
  <EmptyState
    title="Kunne ikke laste korpset"
    description="Noe gikk galt da besetningen skulle hentes. Last siden på nytt for å prøve igjen."
  >
    {#snippet icon()}<TriangleAlert size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else if sections.length === 0}
  <EmptyState
    title="Ingen musikanter ennå"
    description="Her dukker medlemmene opp så snart de har fått tildelt en stemme fra stemmekatalogen."
  >
    {#snippet icon()}<UsersRound size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else}
  <nav class="jump" aria-label="Gå til gruppe">
    <!-- First, and the only chip that isn't a group: the reader's own section is
         the one they came to find. Which section it is stays unsaid here — the
         band it jumps to says it, and a group name in the chip would read as a
         duplicate of the one further along the same row. -->
    {#if ownSectionId}
      <a class="chip chip--own" href={`#${ownSectionId}`}>Din gruppe</a>
    {/if}
    {#each sections as section (section.group)}
      <a class="chip" href={`#${section.id}`}>
        {section.group}
        <b>{section.seats.length}</b>
      </a>
    {/each}
  </nav>

  {#each sections as section, sectionIndex (section.group)}
    <section class="section" id={section.id}>
      {@render sectionBand(section)}
      <div class="members">
        {#each section.seats as seat, seatIndex (seat.musician)}
          <div
            in:fly|global={cardEnter(
              sectionCardOffsets[sectionIndex] + seatIndex,
            )}
          >
            <RosterCard
              musician={seat.musician}
              part={seat.part}
              isYou={!!auth.userId && seat.musician.id === auth.userId}
              onopen={() => openMember(seat.musician, section.group)}
            />
          </div>
        {/each}
      </div>
    </section>
  {/each}
{/if}

<RosterMemberDialog bind:open={isDialogOpen} member={selectedMember} />

<style>
  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 40px;
    padding-bottom: 26px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .intro h1 {
    margin: 0;
    font-size: 46px;
  }
  .intro p {
    margin: 14px 0 0;
    max-width: 520px;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  .tally {
    display: flex;
    gap: 34px;
    flex-shrink: 0;
    padding-bottom: 4px;
  }
  .tally div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tally b {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 34px;
    line-height: 1;
    color: var(--white);
  }
  .tally span {
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
  }

  .jump {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 26px 0 44px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 36px;
    padding: 0 15px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: 13.5px;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    transition:
      border-color var(--dur-fast),
      color var(--dur-fast),
      background var(--dur-fast);
  }
  .chip:hover {
    border-color: var(--brass-500);
    color: var(--white);
    background: var(--surface-hover);
  }
  /* Brass, so it reads as the one chip that is about the reader rather than about
     the band. It carries no count, so it is also the one chip with a single
     line of text — which is what sets it apart at a glance. */
  .chip--own {
    border-color: var(--brass-700);
    background: var(--accent-soft);
    color: var(--brass-300);
    font-weight: 600;
  }
  .chip--own:hover {
    border-color: var(--brass-500);
    background: var(--accent-soft);
    color: var(--white);
  }
  .chip b {
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .chip:hover b {
    color: var(--brass-500);
  }

  /* Clear of the fixed header, so a chip doesn't scroll its section under it. */
  .section {
    scroll-margin-top: calc(var(--header-height) + 18px);
  }
  .section + .section {
    margin-top: 40px;
  }
  .band {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }
  .band h2 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-secondary);
    white-space: nowrap;
  }
  /* Sits with the heading rather than over the cards: the section is what is the
     reader's, not any one face in it. */
  .band__you {
    flex-shrink: 0;
    padding: 3px 9px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--brass-300);
    font-family: var(--font-display);
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    white-space: nowrap;
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }
  .count {
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .members {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
    gap: 18px;
  }
  /* The card is a component, so its entrance transition needs an element of its
     own to sit on. A grid stretches the card back out to the cell the wrapper
     took over. */
  .members > div {
    display: grid;
  }

  @media (max-width: 640px) {
    .intro {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }
    .intro h1 {
      font-size: 34px;
    }
    .intro p {
      margin-top: 10px;
      font-size: 15px;
    }
    .tally {
      gap: 26px;
      margin-top: 18px;
      padding-top: 16px;
      padding-bottom: 0;
      border-top: 1px solid var(--border-subtle);
    }
    .tally b {
      font-size: 26px;
    }
    .tally span {
      font-size: 10px;
    }

    /* Six group names wrap onto three lines in a phone-width column, pushing the
       first face off screen — so the row scrolls sideways instead. It bleeds
       past the page's own padding to the screen edge, so a half-visible chip
       reads as "there is more this way". */
    .jump {
      flex-wrap: nowrap;
      overflow-x: auto;
      margin-inline: -24px;
      padding-inline: 24px;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .jump::-webkit-scrollbar {
      display: none;
    }
    .chip {
      flex-shrink: 0;
      gap: 8px;
      padding: 0 14px;
    }
    .chip b {
      font-size: 11px;
    }

    .section + .section {
      margin-top: 26px;
    }
    .band {
      gap: 12px;
      margin-bottom: 14px;
    }
    .band h2 {
      font-size: 13px;
    }
    .count {
      font-size: 11px;
    }
    .members {
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
  }
</style>
