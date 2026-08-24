<script lang="ts">
  import { initialsFrom } from "$lib/utils/initials";
  import { profilePictures } from "$lib/stores/profilePictures.svelte";

  /**
   * The disc standing for a person: their profile picture, or their initials on
   * the brass disc until they have one (see `initialsFrom`).
   *
   * Shared by the account menu in the header, the Brukere list and a user's own
   * page, so the same person reads the same everywhere. It carries no information
   * the name beside it doesn't, so it is hidden from screen readers rather than
   * read out as a pair of letters or an unnamed image — every place it appears
   * names the user in full next to it.
   *
   * `userId` and `pictureVersion` come as a pair: the version is what the API
   * reports on the user (`profilePictureVersion`), and passing it is what asks for
   * the picture at all. A user with none has no version, so an avatar given one
   * user's id and nothing else simply stays on the initials — which is also what
   * it shows while the picture is being fetched, and if the fetch comes back
   * empty.
   *
   * `fill` swaps the pixel `size` for the whole of whatever the avatar is placed
   * in, initials included — they take the font size they inherit. It is for the
   * one place the disc isn't a fixed number of pixels wide: the roster card's
   * portrait, sized as a share of a card that grows with the grid.
   *
   * `muted` swaps the solid brass disc for a dim dark one with brass initials,
   * for the Korpset roster: a grid of thirty solid-orange discs turned out to be
   * too much of the accent colour repeated at that scale, where the header's and
   * Brukere's one avatar at a time reads fine.
   */
  let {
    name,
    size = 32,
    userId = null,
    pictureVersion = null,
    fill = false,
    muted = false,
  }: {
    name: string | null | undefined;
    size?: number;
    userId?: string | null;
    pictureVersion?: string | null;
    fill?: boolean;
    muted?: boolean;
  } = $props();

  let initials = $derived(initialsFrom(name));
  let pictureUrl = $derived(userId ? profilePictures.urlFor(userId) : null);

  // The fetch lives here rather than in the store's own read, so rendering an
  // avatar stays free of side effects. The store does the deduplicating: every
  // avatar for one person asks, and one request answers them all.
  $effect(() => {
    if (userId) profilePictures.load(userId, pictureVersion);
  });
</script>

<span
  class="user-avatar"
  class:fill
  class:muted
  class:has-picture={!!pictureUrl}
  style={fill
    ? undefined
    : `width:${size}px; height:${size}px; font-size:${size * 0.39}px;`}
  aria-hidden="true"
>
  {#if pictureUrl}
    <img src={pictureUrl} alt="" />
  {:else}
    {initials}
  {/if}
</span>

<style>
  .user-avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: var(--radius-full);
    background: var(--brass-500);
    color: var(--white);
    font-family: var(--font-display);
    font-weight: 600;
    /* Matches the font-size so the line box hugs the glyphs — the browser's
       default line-height leaves asymmetric leading above/below the text,
       which grid's own centering can't correct since it centers the line box,
       not the glyph ink. */
    line-height: 1;
    letter-spacing: 0.04em;
  }
  /* Sized by whatever it sits in instead of by `size`, the initials along with
     it — the placing element owns both. */
  .user-avatar.fill {
    width: 100%;
    height: 100%;
  }
  /* Dim initials on a dark disc rather than the solid brass one — see `muted`
     above. Transitions on its own so a hover that only recolours the initials
     (the roster card's) doesn't need its own rule. */
  .user-avatar.muted {
    background: linear-gradient(
      160deg,
      var(--surface-hover) 0%,
      var(--surface-sunken) 100%
    );
    color: var(--brass-400);
    transition: color var(--dur-base);
  }
  /* No brass behind a picture: it covers the disc completely, and would show at
     the edges through the rounding while the image decodes. */
  .user-avatar.has-picture {
    background: var(--surface-sunken);
    overflow: hidden;
  }
  /* `cover` rather than `contain`: the API already crops to a square, so filling
     the disc can only trim rounding artefacts — where letterboxing a portrait
     inside it would leave gaps down the sides. */
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
