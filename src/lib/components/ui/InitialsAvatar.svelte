<script lang="ts">
  import { initialsFrom } from "$lib/utils/initials";

  /**
   * The brass disc standing in for a person's picture. There is no avatar
   * upload, so their initials are the whole of it (see `initialsFrom`).
   *
   * Shared by the account menu in the header and the Brukere list, so the same
   * person reads the same in both. It carries no information the name beside it
   * doesn't, so it is hidden from screen readers rather than read out as a pair
   * of letters — every place it appears names the user in full next to it.
   */
  let { name, size = 32 }: { name: string | null | undefined; size?: number } =
    $props();

  let initials = $derived(initialsFrom(name));
</script>

<span
  class="initials-avatar"
  style="width:{size}px; height:{size}px; font-size:{size * 0.39}px;"
  aria-hidden="true"
>
  {initials}
</span>

<style>
  .initials-avatar {
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
</style>
