<script module lang="ts">
  export type LoaderVariant =
    | "valves"
    | "slide"
    | "needle"
    | "notes"
    | "metronome";
  export type LoaderSize = "sm" | "md" | "lg";
</script>

<script lang="ts">
  import Spinner from "./Spinner.svelte";

  // Brass band loading marks. Every mark is built from the same two greys plus
  // one brass part in motion, so a screen never shows more than a single moving
  // accent. Pick by the room available: `valves`/`notes` inline, `slide` where a
  // horizontal shape fits, `needle`/`metronome` for the larger waits — and never
  // run two different marks on one screen.
  const SIZES: Record<LoaderSize, number> = { sm: 18, md: 28, lg: 44 };

  let {
    variant = "valves",
    size = "md",
    label = "",
    class: className = "",
  }: {
    variant?: LoaderVariant;
    size?: LoaderSize | number;
    label?: string;
    class?: string;
  } = $props();

  let pixels = $derived(typeof size === "number" ? size : SIZES[size]);
</script>

<span
  class="loader {className}"
  style="--loader-size: {pixels}px"
  role="status"
  aria-live="polite"
  aria-label={label || "Laster"}
>
  <span class="mark">
    {#if variant === "valves"}
      <span class="valves">
        {#each [0, 1, 2] as index}
          <span class="valve" style="--valve-index: {index}">
            <span class="valve__piston">
              <span class="valve__button"></span>
              <span class="valve__stem"></span>
            </span>
            <span class="valve__casing"></span>
            <span class="valve__base"></span>
          </span>
        {/each}
      </span>
    {:else if variant === "slide"}
      <span class="slide">
        <span class="slide__tube slide__tube--top"></span>
        <span class="slide__tube slide__tube--bottom"></span>
        <span class="slide__receiver"></span>
        <span class="slide__outer">
          <span class="slide__bow"></span>
          <span class="slide__crook"></span>
          <span class="slide__grip"></span>
        </span>
      </span>
    {:else if variant === "needle"}
      <span class="needle">
        <span class="needle__dial"></span>
        {#each [-34, -22, -11, 11, 22, 34] as angle}
          <span class="needle__tick" style="--tick-angle: {angle}deg"></span>
        {/each}
        <span class="needle__centre"></span>
        <span class="needle__glyph needle__glyph--flat">♭</span>
        <span class="needle__glyph needle__glyph--sharp">♯</span>
        <span class="needle__rod"></span>
        <span class="needle__lock"></span>
        <span class="needle__pivot"></span>
      </span>
    {:else if variant === "notes"}
      <span class="notes">
        {#each [0, 1, 2] as index}
          <span class="note" style="--note-index: {index}">
            <span class="note__stem"></span>
            <span class="note__head"></span>
          </span>
        {/each}
      </span>
    {:else}
      <span class="metronome">
        <span class="metronome__case"></span>
        <span class="metronome__face"></span>
        <span class="metronome__foot"></span>
        <span class="metronome__rod">
          <span class="metronome__weight"></span>
        </span>
      </span>
    {/if}
  </span>

  <!-- The marks travel and swing far more than a spinning ring does, so a reader
       who asked for reduced motion gets the plain ring instead — still clearly
       "in progress", without the sweep. Swapped in CSS so no instance needs its
       own matchMedia listener. -->
  <span class="reduced-motion-fallback"><Spinner size={pixels} /></span>

  {#if label}<span class="label">{label}</span>{/if}
</span>

<style>
  .loader {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--loader-size) * 0.42);
  }
  .mark {
    display: inline-flex;
  }
  .label {
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .reduced-motion-fallback {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .mark {
      display: none;
    }
    .reduced-motion-fallback {
      display: inline-flex;
    }
  }

  /* ---- valves: a fixed casing per valve with a finger button on a stem above
     it. Only the button and stem move — they press down into the casing. ---- */
  .valves {
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--loader-size) * 0.1);
    height: var(--loader-size);
  }
  .valve {
    position: relative;
    width: calc(var(--loader-size) * 0.26);
    height: 100%;
  }
  .valve__piston {
    position: absolute;
    inset: 0 0 auto;
    height: calc(var(--loader-size) * 0.43);
    animation: valve-press 1.25s cubic-bezier(0.35, 0, 0.25, 1) infinite;
    animation-delay: calc(var(--valve-index) * 0.14s);
  }
  .valve__button {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: calc(var(--loader-size) * 0.09);
    border-radius: calc(var(--loader-size) * 0.09);
    background: linear-gradient(180deg, var(--brass-300), var(--brass-600));
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .valve__stem {
    position: absolute;
    left: 50%;
    translate: -50% 0;
    top: calc(var(--loader-size) * 0.09);
    bottom: 0;
    width: max(1.5px, calc(var(--loader-size) * 0.055));
    background: var(--brass-700);
  }
  .valve__casing {
    position: absolute;
    left: 50%;
    translate: -50% 0;
    top: calc(var(--loader-size) * 0.3);
    bottom: calc(var(--loader-size) * 0.07);
    width: calc(var(--loader-size) * 0.19);
    border-radius: calc(var(--loader-size) * 0.076);
    background: linear-gradient(
      180deg,
      var(--surface-hover),
      var(--surface-sunken)
    );
    box-shadow: inset 0 0 0 1px var(--border-strong);
  }
  .valve__base {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: calc(var(--loader-size) * 0.055);
    border-radius: calc(var(--loader-size) * 0.03);
    background: var(--border-strong);
  }
  @keyframes valve-press {
    0%,
    62%,
    100% {
      transform: translateY(0);
    }
    22%,
    40% {
      transform: translateY(calc(var(--loader-size) * 0.13));
    }
  }

  /* ---- slide: two fixed inner tubes with a brace at the receiver end, and the
     outer slide — a U with the bow at the far end — travelling out and back. ---- */
  .slide {
    --slide-thickness: max(1.5px, calc(var(--loader-size) * 0.06));
    position: relative;
    width: calc(var(--loader-size) * 1.9);
    height: calc(var(--loader-size) * 0.5);
  }
  .slide__tube {
    position: absolute;
    left: 0;
    right: 44%;
    height: var(--slide-thickness);
    border-radius: var(--slide-thickness);
    background: var(--border-strong);
  }
  .slide__tube--top {
    top: 0;
  }
  .slide__tube--bottom {
    bottom: 0;
  }
  .slide__receiver {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: var(--slide-thickness);
    border-radius: var(--slide-thickness);
    background: var(--border-strong);
  }
  .slide__outer {
    position: absolute;
    left: 20%;
    top: 0;
    width: 56%;
    height: 100%;
    animation: slide-travel 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  }
  .slide__bow {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    border-top: var(--slide-thickness) solid var(--accent);
    border-right: var(--slide-thickness) solid var(--accent);
    border-bottom: var(--slide-thickness) solid var(--accent);
    border-top-right-radius: calc(var(--loader-size) * 0.25);
    border-bottom-right-radius: calc(var(--loader-size) * 0.25);
  }
  .slide__crook {
    position: absolute;
    left: 9%;
    top: var(--slide-thickness);
    bottom: var(--slide-thickness);
    width: var(--slide-thickness);
    border-radius: var(--slide-thickness);
    background: var(--accent);
  }
  .slide__grip {
    position: absolute;
    left: 9%;
    top: calc(var(--loader-size) * 0.25 - var(--slide-thickness) * 1.1);
    width: calc(var(--slide-thickness) * 2.2);
    height: calc(var(--slide-thickness) * 2.2);
    border-radius: var(--slide-thickness);
    background: var(--accent);
  }
  @keyframes slide-travel {
    0%,
    6% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(36%);
    }
    94%,
    100% {
      transform: translateX(0);
    }
  }

  /* ---- needle: a tuner dial with flat/sharp marks either side of a centre
     tick, and a green lock lamp that lights as the needle settles. ---- */
  .needle {
    --needle-rod: max(1.5px, calc(var(--loader-size) * 0.055));
    --needle-pivot: calc(var(--loader-size) * 0.115);
    position: relative;
    width: calc(var(--loader-size) * 1.16);
    height: calc(var(--loader-size) * 0.62);
  }
  .needle__dial {
    position: absolute;
    left: calc(var(--loader-size) * 0.08);
    bottom: 0;
    width: var(--loader-size);
    height: calc(var(--loader-size) / 2);
    box-sizing: border-box;
    border: 1px solid var(--border-strong);
    border-bottom: none;
    border-top-left-radius: var(--loader-size);
    border-top-right-radius: var(--loader-size);
  }
  .needle__tick {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 1px;
    height: calc(var(--loader-size) * 0.558);
    margin-left: -0.5px;
    transform-origin: 50% 100%;
    transform: rotate(var(--tick-angle));
  }
  .needle__tick::after {
    content: "";
    position: absolute;
    left: 0;
    top: calc(var(--loader-size) * 0.062);
    width: 1px;
    height: calc(var(--loader-size) * 0.062);
    background: var(--text-muted);
    opacity: 0.55;
  }
  .needle__centre {
    position: absolute;
    left: 50%;
    top: calc(var(--loader-size) * 0.0992);
    width: 1.5px;
    height: calc(var(--loader-size) * 0.0806);
    margin-left: -0.75px;
    background: var(--brass-700);
  }
  .needle__glyph {
    position: absolute;
    top: calc(var(--loader-size) * 0.0868);
    font-family: var(--font-display);
    font-size: max(8px, calc(var(--loader-size) * 0.19));
    font-weight: 600;
    line-height: 1;
    color: var(--text-muted);
    animation: needle-dim 2.1s linear infinite;
  }
  .needle__glyph--flat {
    left: 0;
  }
  .needle__glyph--sharp {
    right: 0;
  }
  .needle__rod {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: var(--needle-rod);
    height: calc(var(--loader-size) * 0.4464);
    margin-left: calc(var(--needle-rod) / -2);
    border-radius: var(--needle-rod);
    transform-origin: 50% 100%;
    background: linear-gradient(180deg, var(--brass-300), var(--brass-600));
    animation: needle-settle 2.1s cubic-bezier(0.42, 0, 0.58, 1) infinite;
  }
  .needle__lock {
    position: absolute;
    left: 50%;
    top: 0;
    width: calc(var(--loader-size) * 0.13);
    height: calc(var(--loader-size) * 0.13);
    margin-left: calc(var(--loader-size) * -0.065);
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 calc(var(--loader-size) * 0.2) var(--success-soft);
    animation: needle-lock 2.1s linear infinite;
  }
  .needle__pivot {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: var(--needle-pivot);
    height: var(--needle-pivot);
    margin-left: calc(var(--needle-pivot) / -2);
    margin-bottom: calc(var(--needle-pivot) / -2);
    border-radius: 50%;
    background: var(--brass-600);
  }
  @keyframes needle-settle {
    0% {
      transform: rotate(-28deg);
    }
    30% {
      transform: rotate(22deg);
    }
    52% {
      transform: rotate(-8deg);
    }
    68% {
      transform: rotate(3deg);
    }
    78%,
    92% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(-28deg);
    }
  }
  @keyframes needle-lock {
    0%,
    74% {
      opacity: 0;
    }
    82%,
    90% {
      opacity: 1;
    }
    96%,
    100% {
      opacity: 0;
    }
  }
  @keyframes needle-dim {
    0%,
    72% {
      opacity: 1;
    }
    80%,
    94% {
      opacity: 0.25;
    }
    100% {
      opacity: 1;
    }
  }

  /* ---- notes: three quarter notes — filled head, straight stem — lifting in
     sequence. ---- */
  .notes {
    display: inline-flex;
    align-items: flex-end;
    gap: calc(var(--loader-size) * 0.12);
    height: calc(var(--loader-size) * 0.86);
  }
  .note {
    position: relative;
    width: calc(var(--loader-size) * 0.3);
    height: 100%;
    animation: note-lift 1.4s ease-in-out infinite;
    animation-delay: calc(var(--note-index) * 0.15s);
  }
  .note__stem {
    position: absolute;
    right: calc(var(--loader-size) * 0.03);
    top: 0;
    bottom: calc(var(--loader-size) * 0.0999);
    width: max(1.5px, calc(var(--loader-size) * 0.055));
    border-radius: max(1.5px, calc(var(--loader-size) * 0.055));
    background: var(--brass-600);
  }
  .note__head {
    position: absolute;
    left: 0;
    bottom: 0;
    width: calc(var(--loader-size) * 0.3);
    height: calc(var(--loader-size) * 0.222);
    border-radius: 50%;
    background: var(--accent);
    transform: rotate(-20deg);
  }
  @keyframes note-lift {
    0%,
    100% {
      opacity: 0.26;
      transform: translateY(0);
    }
    30% {
      opacity: 1;
      transform: translateY(-13%);
    }
  }

  /* ---- metronome: pendulum in a wedge case. ---- */
  .metronome {
    --metronome-rod: max(1.5px, calc(var(--loader-size) * 0.05));
    --metronome-weight: calc(var(--loader-size) * 0.22);
    position: relative;
    width: calc(var(--loader-size) * 0.88);
    height: var(--loader-size);
  }
  .metronome__case {
    position: absolute;
    inset: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    background: var(--border-strong);
  }
  .metronome__face {
    position: absolute;
    inset: 1px;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    background: linear-gradient(180deg, var(--ink-800), var(--black));
  }
  .metronome__foot {
    position: absolute;
    left: 12%;
    right: 12%;
    bottom: 0;
    height: 1px;
    background: var(--brass-700);
  }
  .metronome__rod {
    position: absolute;
    left: 50%;
    bottom: 5%;
    width: var(--metronome-rod);
    height: 84%;
    margin-left: calc(var(--metronome-rod) / -2);
    transform-origin: 50% 100%;
    background: var(--brass-700);
    animation: metronome-swing 1.05s cubic-bezier(0.37, 0, 0.63, 1) infinite;
  }
  .metronome__weight {
    position: absolute;
    left: 50%;
    top: 24%;
    width: var(--metronome-weight);
    height: calc(var(--metronome-weight) / 2);
    margin-left: calc(var(--metronome-weight) / -2);
    border-radius: 1px;
    background: var(--accent);
  }
  @keyframes metronome-swing {
    0% {
      transform: rotate(-17deg);
    }
    50% {
      transform: rotate(17deg);
    }
    100% {
      transform: rotate(-17deg);
    }
  }
</style>
