<script lang="ts">
  // Page-level progress. Leave `value` out for the indeterminate trombone slide;
  // pass it for a real percentage. One bar per page, and never together with a
  // full-page overlay.
  let {
    value = null,
    label = "",
    height = 3,
    sticky = false,
  }: {
    value?: number | null;
    label?: string;
    height?: number;
    /** Pins the bar across the very top of the viewport, above the header. */
    sticky?: boolean;
  } = $props();

  let isDeterminate = $derived(value !== null);
  let percent = $derived(Math.max(0, Math.min(100, value ?? 0)));
</script>

<div
  class="bar"
  class:sticky
  style="--bar-height: {height}px"
  role="progressbar"
  aria-valuenow={isDeterminate ? percent : undefined}
  aria-valuemin={0}
  aria-valuemax={100}
>
  {#if label && !sticky}
    <div class="bar__heading">
      <span class="bar__label">{label}</span>
      {#if isDeterminate}
        <span class="bar__percent">{Math.round(percent)}%</span>
      {/if}
    </div>
  {/if}
  <div class="bar__track">
    {#if isDeterminate}
      <div class="bar__fill" style="width: {percent}%"></div>
    {:else}
      <div class="bar__sweep"></div>
    {/if}
  </div>
</div>

<style>
  .bar {
    position: relative;
    width: 100%;
  }
  .bar.sticky {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: auto;
    z-index: 60;
  }
  .bar__heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }
  .bar__label {
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest);
    color: var(--text-muted);
  }
  .bar__percent {
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--brass-300);
  }
  .bar__track {
    position: relative;
    height: var(--bar-height);
    border-radius: var(--bar-height);
    background: var(--surface-sunken);
    box-shadow: inset 0 0 0 1px var(--border-subtle);
    overflow: hidden;
  }
  .sticky .bar__track {
    border-radius: 0;
    box-shadow: none;
  }
  .bar__fill {
    height: 100%;
    border-radius: var(--bar-height);
    background: var(--accent);
    transition: width var(--dur-base) var(--ease-out);
  }
  .sticky .bar__fill,
  .sticky .bar__sweep {
    border-radius: 0;
  }
  .bar__sweep {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 34%;
    border-radius: var(--bar-height);
    background: var(--accent);
    animation: bar-sweep 1.7s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  }
  @keyframes bar-sweep {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(194%);
    }
    100% {
      transform: translateX(0);
    }
  }

  /* A bar sweeping the full width is a lot of travel. For a reader who asked for
     reduced motion it fills the track and pulses instead — still "working", but
     it stays put. */
  @media (prefers-reduced-motion: reduce) {
    .bar__sweep {
      width: 100% !important;
      animation: bar-pulse 1.8s ease-in-out infinite !important;
    }
    @keyframes bar-pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.35;
      }
    }
  }
</style>
