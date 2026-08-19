<script lang="ts">
  import type { User } from "$lib/types";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import UserAvatar from "./UserAvatar.svelte";

  /**
   * A row of overlapping faces standing for a group of people — who plays a
   * stemme, in the catalogue. Past `maximum` it stops and counts the rest, since
   * discs this small stop reading as faces long before a section runs out of
   * members.
   *
   * Takes users rather than flat props, unlike most of the primitives here, for
   * the same reason `UserAvatar` is about a person rather than an image: the
   * picture version has to come off the user, and asking every caller to unpack
   * it would only spread that one detail around.
   *
   * The faces are hidden from screen readers — each one is, on its own — so the
   * stack carries every name in its own label. Unlike the avatar in a Brukere
   * row, there is no name in text beside it to lean on.
   */
  let {
    users,
    size = 28,
    maximum = 4,
  }: {
    users: User[];
    size?: number;
    /** How many faces to show before the rest become a count. */
    maximum?: number;
  } = $props();

  let shown = $derived(users.slice(0, maximum));
  let remaining = $derived(users.length - shown.length);
  let names = $derived(users.map((user) => user.name ?? "Ukjent").join(", "));
  // A share of the disc, so the overlap keeps its proportions at any size.
  let overlap = $derived(Math.round(size * 0.3));

  /** Every disc but the leftmost is pulled over the one before it. */
  function inset(index: number): string {
    return index === 0 ? "0" : `-${overlap}px`;
  }
</script>

<span class="stack" role="img" aria-label={names}>
  {#each shown as user, index (user.id)}
    <span class="face" style="margin-left:{inset(index)}" title={user.name}>
      <UserAvatar
        name={user.name}
        userId={user.id}
        pictureVersion={profilePictureVersion(user)}
        {size}
      />
    </span>
  {/each}
  {#if remaining > 0}
    <span
      class="face more"
      style="margin-left:{inset(
        shown.length,
      )}; width:{size}px; height:{size}px; font-size:{size * 0.36}px"
    >
      +{remaining}
    </span>
  {/if}
</span>

<style>
  .stack {
    display: inline-flex;
    align-items: center;
  }
  /*
   * Each face paints over the one to its left, which is what makes the row read
   * as a stack; the ring in the surface's own colour is what reads as the gap
   * between them. A host whose background changes under the stack — a table row
   * on hover — sets `--avatar-stack-ring` to keep the gap invisible, since a ring
   * left in the resting colour would outline every face on the row being pointed
   * at.
   */
  .face {
    display: inline-flex;
    border-radius: var(--radius-full);
    box-shadow: 0 0 0 2px var(--avatar-stack-ring, var(--surface-card));
  }
  .more {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-family: var(--font-text);
    font-weight: 600;
    line-height: 1;
  }
</style>
