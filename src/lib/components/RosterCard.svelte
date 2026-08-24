<script lang="ts">
  import type { Musician, Part } from "$lib/types";
  import { managingRoleLabel } from "$lib/utils/roster";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import { UserAvatar } from "$lib/components/ui";

  /**
   * One member on the Korpset page: their portrait on a black well, the stemme
   * that seats them in this section, and their name on the plate below.
   *
   * A button rather than a card with a click handler — it opens the member's
   * dialog, so it has to be reachable and operable from the keyboard like any
   * other control. The avatar is hidden from screen readers, since initials and
   * a portrait say nothing the name doesn't.
   */
  let {
    musician,
    part,
    onopen,
  }: {
    musician: Musician;
    /** The stemme this section seats them by — see `RosterSeat`. */
    part: Part;
    onopen: () => void;
  } = $props();

  let roleLabel = $derived(managingRoleLabel(musician.roles ?? []));

  /**
   * The card read out loud. Spelled out rather than left to the text inside,
   * which the layout puts in the order it looks best — the role badge and the
   * stemme sit over the portrait, so a reader would hear them before the name
   * they belong to.
   */
  let label = $derived(
    [musician.name, part.name, roleLabel]
      .filter((line): line is string => !!line)
      .join(", "),
  );
</script>

<button type="button" class="member" aria-label={label} onclick={onopen}>
  <span class="portrait">
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
      <span class="tag"><span class="dot"></span>{roleLabel}</span>
    {/if}
    <span class="part">{part.name}</span>
  </span>
  <span class="plate"><span class="name">{musician.name}</span></span>
</button>

<style>
  .member {
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
      box-shadow var(--dur-base);
  }
  /* Lift and a deeper shadow only — a brass edge here read as a stray outline
     rather than a lift, so the border is left exactly as it was. */
  .member:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  .member:focus-visible {
    outline: 2px solid var(--brass-500);
    outline-offset: 2px;
  }

  /* The portrait well. Its height is left to the content: a fixed aspect ratio
     would either crop the stemme pill away or leave a gap under it, depending on
     how wide the grid happens to have made the card. A flat black well made a
     grid of them read as a wall of identical tiles; the vignette gives each one
     a centre for the disc to sit in. */
  .portrait {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 28px 16px 16px;
    background: radial-gradient(
      120% 96% at 50% 0%,
      var(--surface-sunken) 0%,
      var(--black) 78%
    );
    overflow: hidden;
    /* The well is what the disc and the initials inside it are measured
       against — see `.disc`. */
    container-type: inline-size;
  }
  .portrait::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("/img/music-notes.png");
    background-size: 360px 178px;
    background-position: center;
    opacity: 0.06;
  }

  /* The disc is a share of the card, which the grid sizes, so the initials
     inside it can't be a fixed number of pixels either — `UserAvatar fill`
     inherits the size set here. Both are shares of the well: the design's disc
     is 58% of it, and its 42px initials in the 134px disc that leaves come to
     18.2% of the well in turn.
     No ring: a 1px brass edge pixelates on a photo this small, and looked worse
     than the plain disc it was meant to frame. */
  .disc {
    position: relative;
    width: 58%;
    aspect-ratio: 1;
    font-size: 18.2cqw;
    border-radius: var(--radius-full);
    overflow: hidden;
    transition: transform var(--dur-slow) var(--ease-out);
  }
  .member:hover .disc {
    transform: scale(1.04);
  }
  /* Recolours the fallback initials rather than ringing the disc — reaches past
     `UserAvatar`'s own scoped style, which is what sets `.muted`'s colour. */
  .member:hover .disc :global(.user-avatar.muted) {
    color: var(--brass-300);
  }

  /* Both plates sit over the portrait, so neither may swallow the click meant
     for the button under them. */
  .part,
  .tag {
    pointer-events: none;
  }
  .part {
    position: relative;
    z-index: 2;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 11px;
    border: 1px solid var(--brass-700);
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--black) 82%, transparent);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--brass-300);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* A soft chip rather than a solid block: a filled brass tag on every card that
     has one competed with the disc for the eye that's supposed to land there
     first. The dot is what still reads as a marker at a glance. */
  .tag {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 20px;
    padding: 0 9px 0 7px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--brass-300);
    font-family: var(--font-display);
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .tag .dot {
    width: 5px;
    height: 5px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--brass-400);
  }

  .plate {
    display: flex;
    align-items: center;
    min-height: 60px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
  }
  /* Balanced rather than left to break where it runs out of room: a Norwegian
     name of three or four parts is the common case here, and the ragged split
     reads as a mistake on a plate this narrow. */
  .name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.25;
    color: var(--text-primary);
    text-wrap: balance;
  }

  @media (max-width: 640px) {
    .portrait {
      gap: 13px;
      padding: 20px 11px 13px;
    }
    /* A wider disc in a narrower well: 34px initials in the 105px disc 72%
       leaves is 23.3% of the well. */
    .disc {
      width: 72%;
      font-size: 23.3cqw;
    }
    .part {
      height: 22px;
      padding: 0 10px;
      font-size: 10.5px;
      letter-spacing: 0.03em;
    }
    .tag {
      top: 8px;
      left: 8px;
      height: 19px;
      padding: 0 8px 0 6px;
      font-size: 9px;
      letter-spacing: 0.09em;
    }
    .plate {
      min-height: 52px;
      padding: 10px 12px;
    }
    .name {
      font-size: 14px;
    }
  }
</style>
