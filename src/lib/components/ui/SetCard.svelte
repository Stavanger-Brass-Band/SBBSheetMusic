<script lang="ts">
  import { GripVertical, Trash2 } from "@lucide/svelte";

  // Signature "stacked sheet-music" card: a white sheet with a folded black
  // corner and a faint notes texture, sitting like a small stack of paper.
  // When `removable`, a remove button is overlaid (revealed on hover) — used
  // in the project editor; the rest of the card stays a link to `href`.
  // `ordinal` adds the concert-order chip and `reorderable` the grip affordance
  // and grab cursor; the drag itself is wired by the parent, which owns the
  // list being reordered and passes `dragging` for the card in flight.
  let {
    title = "",
    composer = "",
    arranger = "",
    art = "/img/music-notes.png",
    href = "#",
    removable = false,
    onremove,
    ordinal,
    reorderable = false,
    dragging = false,
  }: {
    title?: string | null;
    composer?: string | null;
    arranger?: string | null;
    art?: string;
    href?: string;
    removable?: boolean;
    onremove?: () => void;
    ordinal?: number;
    reorderable?: boolean;
    dragging?: boolean;
  } = $props();

  // Reorderable cards announce where they sit and how to move them without a
  // pointer, since the grip is a visual affordance only.
  let linkLabel = $derived(
    reorderable && ordinal !== undefined
      ? `${title ?? ""} — nr. ${ordinal}. Bruk Alt + piltast for å flytte.`
      : (title ?? ""),
  );
</script>

<div class="set-card" class:reorderable class:dragging>
  <!-- The link must not become the drag source: with it out of the running the
       browser picks up the draggable wrapper the parent puts around the card. -->
  <a class="set-card__link" {href} aria-label={linkLabel} draggable="false"></a>
  <span class="corner"></span>
  {#if art}<img class="texture" src={art} alt="" />{/if}

  {#if ordinal !== undefined || reorderable || removable}
    <div class="controls">
      {#if ordinal !== undefined}
        <span class="ordinal">{ordinal}</span>
      {/if}
      {#if reorderable}
        <span class="grip" aria-hidden="true"><GripVertical size={15} /></span>
      {/if}
      {#if removable}
        <button
          type="button"
          class="set-card__rm"
          title="Fjern fra prosjektet"
          aria-label={`Fjern ${title ?? ""}`}
          onclick={(e) => {
            e.preventDefault();
            onremove?.();
          }}
        >
          <Trash2 size={16} />
        </button>
      {/if}
    </div>
  {/if}

  <div class="title">{title}</div>
  {#if composer || arranger}
    <div class="meta">
      {#if composer}<div>{composer}</div>{/if}
      {#if arranger}<div>Arr. {arranger}</div>{/if}
    </div>
  {/if}
</div>

<style>
  .set-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    aspect-ratio: 1 / 1.31;
    background: var(--white);
    color: var(--ink-900);
    box-shadow: var(--shadow-paper);
    overflow: hidden;
    transition:
      box-shadow var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out);
  }
  .set-card:hover {
    box-shadow: var(--shadow-paper-hover);
    transform: translateY(-4px);
  }
  .set-card__link {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .corner {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    border-style: solid;
    border-width: 20px;
    border-color: var(--ink-900) var(--ink-900) var(--white) var(--white);
    box-shadow: -3px 3px 5px rgba(0, 0, 0, 0.18);
    transition: border-width var(--dur-slow) var(--ease-out);
    pointer-events: none;
  }
  .set-card:hover .corner {
    border-width: 26px;
  }
  .texture {
    position: absolute;
    top: 18px;
    left: 0;
    width: 100%;
    opacity: 0.5;
    pointer-events: none;
    z-index: 0;
  }
  .title {
    position: relative;
    z-index: 2;
    padding: 0 24px;
    pointer-events: none;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 21px;
    line-height: 1.06;
    text-underline-offset: 3px;
  }
  .set-card:hover .title {
    text-decoration: underline;
  }
  .meta {
    position: absolute;
    bottom: 22px;
    left: 20px;
    right: 20px;
    z-index: 2;
    pointer-events: none;
    padding-top: 9px;
    border-top: 1px solid var(--gray-200);
    font-family: var(--font-text);
    font-size: 12px;
    line-height: 1.45;
    color: var(--gray-500);
  }
  /* Keep composer/arranger to a single truncated line each so a long name
     can't wrap and grow upward into the title — the title takes priority. */
  .meta > div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  /* The card shrinks on small screens but the fixed offset doesn't, leaving the
     meta floating too high — pull it back toward the bottom edge. */
  @media (max-width: 640px) {
    .meta {
      bottom: 12px;
      left: 14px;
      right: 14px;
    }
  }
  /* Order chip, grip and remove sit in one cluster over the sheet's corner. */
  .controls {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ordinal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--white);
    background: var(--ink-900);
    border-radius: var(--radius-full);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
  }
  .grip {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-500);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-full);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
    opacity: 0;
    transform: scale(0.86);
    transition:
      opacity var(--dur-fast),
      transform var(--dur-fast);
  }
  .set-card:hover .grip {
    opacity: 1;
    transform: scale(1);
  }
  .set-card__rm {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--red-500);
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--gray-200);
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
    opacity: 0;
    transform: scale(0.86);
    transition:
      opacity var(--dur-fast),
      transform var(--dur-fast),
      background var(--dur-fast);
  }
  .set-card:hover .set-card__rm,
  .set-card__rm:focus-visible {
    opacity: 1;
    transform: scale(1);
  }
  .set-card__rm:hover {
    background: var(--red-100);
  }

  /* ---- reorder affordances ---- */
  /* The link overlay carries the UA's pointer cursor, so it needs the grab
     cursor spelled out too — inheriting from the card doesn't reach it. */
  .set-card.reorderable,
  .set-card.reorderable .set-card__link {
    cursor: grab;
  }
  .set-card.reorderable:active,
  .set-card.reorderable:active .set-card__link {
    cursor: grabbing;
  }
  /* Ordered after :hover so the lifted look wins while the card is in flight. */
  .set-card.dragging {
    opacity: 0.42;
    transform: rotate(-1.5deg) scale(0.98);
    box-shadow: var(--shadow-paper-hover);
  }
  .set-card.dragging .corner {
    border-width: 20px;
  }
</style>
