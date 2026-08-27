<script lang="ts">
  import type { Snippet } from "svelte";
  import Loader, { type LoaderVariant } from "./Loader.svelte";

  // Scrim with a centred mark, for blocking work only — prefer `Skeleton` for a
  // first load, where the shape of the page is already known. Absolute by
  // default, so the parent needs `position: relative`.
  let {
    open = true,
    variant = "metronome",
    label = "Laster…",
    fullscreen = false,
    blur = true,
    children,
  }: {
    open?: boolean;
    variant?: LoaderVariant;
    label?: string;
    fullscreen?: boolean;
    blur?: boolean;
    children?: Snippet;
  } = $props();
</script>

{#if open}
  <div class="overlay" class:fullscreen>
    <!-- The scrim carries the blur, not the overlay itself: a `backdrop-filter`
         on an ancestor drags its own descendants into the filter on some
         compositors, which leaves the mark and its label smudged. As a sibling
         it can only ever blur what is behind it. -->
    <div class="overlay__scrim" class:blur></div>
    <div class="overlay__body">
      <Loader {variant} size="lg" {label} />
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
  }
  .overlay.fullscreen {
    position: fixed;
  }
  .overlay__scrim {
    position: absolute;
    inset: 0;
    background: rgba(11, 11, 12, 0.74);
  }
  .overlay__scrim.blur {
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }
  .overlay__body {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding: 24px;
  }
</style>
