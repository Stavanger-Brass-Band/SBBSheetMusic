<script module lang="ts">
  export type SkeletonVariant =
    | "text"
    | "title"
    | "rect"
    | "circle"
    | "row"
    | "card";
</script>

<script lang="ts">
  // Placeholder shapes for a first load. Use a skeleton when the shape of the
  // result is known, and `LoadingOverlay` when it is not.
  let {
    variant = "text",
    lines = 3,
    count = 1,
    width,
    height,
    radius,
  }: {
    variant?: SkeletonVariant;
    /** `text` only — how many lines to lay out. */
    lines?: number;
    count?: number;
    width?: number | string;
    height?: number | string;
    radius?: number | string;
  } = $props();

  function toLength(
    value: number | string | undefined,
    fallback: string,
  ): string {
    if (value === undefined) return fallback;
    return typeof value === "number" ? `${value}px` : value;
  }

  let lineCount = $derived(Math.max(1, lines));
  let items = $derived(
    Array.from({ length: Math.max(1, count) }, (_, index) => index),
  );
  let lineIndices = $derived(
    Array.from({ length: lineCount }, (_, index) => index),
  );
  let isStacked = $derived(variant === "row" || variant === "text");
  let circleDiameter = $derived(toLength(width ?? height, "44px"));
</script>

<span
  class="skeleton"
  class:stacked={isStacked}
  class:tiled={variant === "card" && count > 1}
  aria-hidden="true"
>
  {#each items as index (index)}
    {#if variant === "circle"}
      <span
        class="block"
        style="width: {circleDiameter}; height: {circleDiameter}; border-radius: 50%"
      ></span>
    {:else if variant === "rect"}
      <span
        class="block"
        style="width: {toLength(width, '100%')}; height: {toLength(
          height,
          '120px',
        )}; border-radius: {toLength(radius, '8px')}"
      ></span>
    {:else if variant === "title"}
      <span
        class="block"
        style="width: {toLength(width, '58%')}; height: {toLength(
          height,
          '20px',
        )}; border-radius: {toLength(radius, '5px')}"
      ></span>
    {:else if variant === "row"}
      <span class="row">
        <span class="block row__avatar"></span>
        <span class="row__lines">
          <span class="block" style="width: 42%; height: 12px"></span>
          <span class="block" style="width: 24%; height: 10px"></span>
        </span>
        <span class="block" style="width: 64px; height: 10px"></span>
      </span>
    {:else if variant === "card"}
      <span class="card">
        <span class="card__well">
          <span class="block card__portrait"></span>
        </span>
        <span class="card__plate">
          <span class="block" style="width: 72%; height: 13px"></span>
          <span class="block" style="width: 40%; height: 10px"></span>
        </span>
      </span>
    {:else}
      <span class="lines">
        {#each lineIndices as lineIndex (lineIndex)}
          <span
            class="block"
            style="width: {lineIndex === lineCount - 1
              ? '62%'
              : '100%'}; height: {toLength(height, '12px')}"
          ></span>
        {/each}
      </span>
    {/if}
  {/each}
</span>

<style>
  .skeleton {
    display: grid;
    gap: 14px;
    min-width: 0;
  }
  .skeleton.stacked {
    display: block;
    gap: 0;
  }
  .skeleton.tiled {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  /* The shimmer has to loop without a seam: a page of these all restart on the
     same frame, so any jump reads as a stutter across the whole grid. Two things
     buy that. The gradient ends on the same colour it starts on, so consecutive
     tiles meet invisibly; and the sweep travels exactly one tile — with a
     background twice the element's width, `background-position` 200% is one tile
     over — so the last frame of a cycle is the first frame of the next. Linear,
     because an eased sweep would coast to a stop at that seam. */
  .block {
    display: block;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      var(--surface-sunken) 0%,
      var(--surface-hover) 50%,
      var(--surface-sunken) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.9s linear infinite;
  }
  @keyframes skeleton-shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: 0% 0;
    }
  }

  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .row__avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .row__lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .lines {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  /* Mirrors the Korpset member card: round portrait well over a name plate. */
  .card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    overflow: hidden;
  }
  .card__well {
    display: grid;
    place-items: center;
    aspect-ratio: 1.3;
    background: var(--black);
  }
  .card__portrait {
    height: 60%;
    aspect-ratio: 1;
    border-radius: 50%;
  }
  .card__plate {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 15px 16px;
    border-top: 1px solid var(--border-subtle);
  }
</style>
