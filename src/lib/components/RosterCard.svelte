<script lang="ts">
  import type { Musician } from "$lib/types";
  import { managingRoleLabel } from "$lib/utils/roster";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import { UserAvatar } from "$lib/components/ui";

  /**
   * One member on the Korpset page: a circular portrait lit in a well, with their
   * name and stemme on the plate below it.
   *
   * Ported from the design system's `Roster` frames. The stemme used to sit as a
   * pill *over* the portrait and now reads as a line under the name, marked by a
   * short brass rule that lengthens on hover — which is what let the well become
   * a fixed 1.3 aspect ratio: nothing inside it varies in height any more, so a
   * row of cards is a row of matching wells rather than one ragged band.
   *
   * A button rather than a card with a click handler — it opens the member's
   * dialog, so it has to be reachable and operable from the keyboard like any
   * other control. The avatar is hidden from screen readers, since initials and a
   * portrait say nothing the name doesn't.
   */
  let {
    musician,
    label,
    isYou = false,
    onopen,
  }: {
    musician: Musician;
    /**
     * What they play in this section, already decided by `RosterSeat.label`: the
     * instrument rather than the chair, or the section's own name for someone who
     * covers several of its instruments. The card only prints it.
     */
    label: string;
    /**
     * Whether this is the signed-in member's own card. A grid of thirty faces is
     * one of the few places in the app where a reader is looking for themselves,
     * and the plate says so rather than the portrait: the well's top-left corner
     * is the role badge's, and two markers over one photograph fought.
     */
    isYou?: boolean;
    onopen: () => void;
  } = $props();

  let roleLabel = $derived(managingRoleLabel(musician.roles ?? []));

  /**
   * The card read out loud. Spelled out rather than left to the text inside,
   * which the layout puts in the order it looks best — the role badge sits over
   * the portrait, so a reader would hear it before the name it belongs to.
   */
  let spokenLabel = $derived(
    [
      isYou ? `${musician.name ?? ""} (deg)`.trim() : musician.name,
      label,
      roleLabel,
    ]
      .filter((line): line is string => !!line)
      .join(", "),
  );
</script>

<button
  type="button"
  class="mcard"
  class:is-you={isYou}
  aria-label={spokenLabel}
  onclick={onopen}
>
  <span class="well">
    <span class="disc">
      <UserAvatar
        fill
        muted
        name={musician.name}
        userId={musician.id ?? null}
        pictureVersion={profilePictureVersion(musician)}
      />
    </span>
    {#if roleLabel}
      <span class="role">{roleLabel}</span>
    {/if}
  </span>

  <span class="plate">
    <span class="plate__top">
      <span class="plate__name">{musician.name}</span>
      {#if isYou}
        <!-- Hidden from screen readers: `aria-label` already says "(deg)", and
             the plate would otherwise read the word twice. -->
        <span class="plate__you" aria-hidden="true">Deg</span>
      {/if}
    </span>
    <span class="plate__part">{label}</span>
  </span>
</button>

<style>
  .mcard {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    font: inherit;
    text-align: left;
    cursor: pointer;
    appearance: none;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition:
      transform var(--dur-base),
      box-shadow var(--dur-base),
      border-color var(--dur-base);
  }
  .mcard:hover {
    transform: translateY(-3px);
    border-color: var(--border-strong);
    box-shadow: var(--shadow-lg);
  }
  .mcard:active {
    border-color: var(--brass-600);
  }
  .mcard:focus-visible {
    outline: 2px solid var(--brass-500);
    outline-offset: 2px;
  }
  /* The one card on the page that carries a brass edge at rest. It is the
     reader's own, and there is only ever one of them — declared after :hover and
     :active so it doesn't fight them: those are momentary, this is not. */
  .mcard.is-you {
    border-color: var(--brass-700);
  }

  /*
   * The portrait well. A fixed aspect ratio, which the old content-height well
   * couldn't have: the stemme pill used to sit in here and its height varied with
   * the name it carried, so a row of cards came out ragged. Nothing inside it
   * varies now.
   *
   * A flat black well made a grid of them read as a wall of identical tiles; the
   * vignette gives each one a centre for the disc to sit in.
   */
  .well {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 1.3;
    background: radial-gradient(
      120% 100% at 50% 6%,
      var(--ink-800) 0%,
      var(--black) 76%
    );
    overflow: hidden;
    /* The well is what the disc and the initials inside it are measured
       against — see `.disc`. */
    container-type: inline-size;
  }
  .well::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("/img/music-notes.png");
    background-size: 300px 148px;
    background-position: center;
    opacity: 0.05;
  }
  /* A concentric hairline puts the face in the middle of a ring without adding
     colour. It grows and warms on hover, which is most of the card's animation —
     the brass arrives only once, and only on the card being pointed at. */
  .well::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    height: 85%;
    width: auto;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.07);
    transition:
      height var(--dur-slow) var(--ease-out),
      border-color var(--dur-base);
  }
  .mcard:hover .well::after {
    height: 94%;
    border-color: var(--brass-700);
  }

  /* The disc is a share of the card, which the grid sizes, so the initials inside
     it can't be a fixed number of pixels either — `UserAvatar fill` inherits the
     font size set here. The design's 30px initials, in the 125px disc that 60% of
     a 208px card leaves, come to 15% of the well. */
  .disc {
    position: relative;
    width: 60%;
    aspect-ratio: 1;
    font-size: 15cqw;
    border-radius: 50%;
    overflow: hidden;
    background: var(--surface-sunken);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.09),
      0 12px 28px rgba(0, 0, 0, 0.55);
    transition: transform var(--dur-base) var(--ease-out);
  }
  .mcard:hover .disc {
    transform: scale(1.04);
  }

  /* Over the portrait, so it must not swallow the click meant for the button
     under it. Frosted rather than solid: it sits on a photograph as often as on
     the empty well, and a solid chip cut a hole in the face behind it. */
  .role {
    position: absolute;
    top: 10px;
    left: 10px;
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 10px;
    border-radius: var(--radius-full);
    background: rgba(11, 11, 12, 0.55);
    box-shadow: inset 0 0 0 1px var(--brass-700);
    font-family: var(--font-display);
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--brass-300);
    backdrop-filter: blur(6px);
    pointer-events: none;
  }

  /*
   * Centred, not top-aligned. The plate takes `flex: 1` so the card fills the
   * height the grid row gives it — and rows stretch to their tallest card, which
   * is whichever one has a name long enough to wrap. Left top-aligned, all of
   * that slack fell below the stemme, so a short-named card sat with its name
   * against the rule and a gap under it. Centring splits the slack evenly, and
   * the padding is the floor rather than the whole measure.
   */
  .plate {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 14px 15px;
    border-top: 1px solid var(--border-subtle);
  }
  .plate__top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  /*
   * A person's name, set the way a person's name is written. The design frames
   * upper-case it, which suits the labels around it — the role badge, the section
   * headings, the tally — but those are labels and this is somebody's name.
   * `letter-spacing` went with it: the 0.03em was there to open up capitals.
   *
   * Balanced rather than left to break where it runs out of room: a Norwegian
   * name of three or four parts is the common case here, and the ragged split
   * reads as a mistake on a plate this narrow.
   */
  .plate__name {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15.5px;
    line-height: 1.15;
    color: var(--text-primary);
    text-wrap: balance;
  }
  .plate__you {
    flex-shrink: 0;
    padding: 2px 7px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--brass-300);
    font-family: var(--font-display);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    line-height: 1.4;
  }
  /* The rule before it is the card's accent, and it is one line of it: a dash
     that lengthens on hover, rather than the bordered pill this used to be. */
  .plate__part {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--brass-300);
  }
  .plate__part::before {
    content: "";
    width: 12px;
    height: 1px;
    background: var(--brass-500);
    flex-shrink: 0;
    transition: width var(--dur-base) var(--ease-out);
  }
  .mcard:hover .plate__part::before {
    width: 22px;
  }

  @media (max-width: 640px) {
    /* A shade squarer, so two cards to a phone row keep the face large. */
    .well {
      aspect-ratio: 1.24;
    }
    .plate {
      padding: 12px 13px;
    }
    .plate__name {
      font-size: 13.5px;
    }
    .plate__part {
      font-size: 10px;
    }
  }
</style>
