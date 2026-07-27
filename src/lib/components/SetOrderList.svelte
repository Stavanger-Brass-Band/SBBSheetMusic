<script lang="ts">
  import { GripVertical } from "@lucide/svelte";
  import type { MusicSet } from "$lib/types";
  import { moveItem } from "$lib/utils/reorder";

  // Touch-friendly reorder list. HTML5 drag-and-drop never fires on touch, so
  // on phones the concert order is changed here instead of in the card grid:
  // drag a row's grip (pointer events) or nudge it with the arrow keys. The
  // neighbours slide aside to show the drop slot and the numbers count up to
  // where the row will land; the new order only reaches the parent once the
  // drag settles.
  let {
    sets,
    movedId,
    onreorder,
  }: {
    sets: MusicSet[];
    movedId?: string;
    onreorder: (next: MusicSet[], movedId: string | undefined) => void;
  } = $props();

  /** Row gap in `.rows` — one row travels its own height plus the gap. */
  const ROW_GAP = 8;

  let dragIndex = $state<number | undefined>();
  let dragOffset = $state(0);
  let dropIndex = $state(0);
  let rowStride = $state(0);

  /** How far a row that isn't being dragged steps aside, in pixels. */
  function rowShift(index: number): number {
    if (dragIndex === undefined || index === dragIndex) return 0;
    if (index > dragIndex && index <= dropIndex) return -rowStride;
    if (index < dragIndex && index >= dropIndex) return rowStride;
    return 0;
  }
  function rowTransform(index: number): string {
    if (dragIndex === undefined) return "";
    const offset = index === dragIndex ? dragOffset : rowShift(index);
    return offset ? `translateY(${offset}px)` : "";
  }
  /** The number a row will carry once the drag settles. */
  function rowNumber(index: number): number {
    if (dragIndex === undefined) return index + 1;
    if (index === dragIndex) return dropIndex + 1;
    const shift = rowShift(index);
    if (shift < 0) return index;
    if (shift > 0) return index + 2;
    return index + 1;
  }

  function startDrag(
    event: PointerEvent & { currentTarget: HTMLElement },
    index: number,
  ) {
    const grip = event.currentTarget;
    const row = grip.closest<HTMLElement>(".row");
    if (!row) return;
    // Claim the gesture so the page doesn't scroll away underneath the row.
    event.preventDefault();
    grip.setPointerCapture(event.pointerId);

    const startY = event.clientY;
    rowStride = row.offsetHeight + ROW_GAP;
    dragIndex = index;
    dropIndex = index;
    dragOffset = 0;

    const onMove = (moveEvent: PointerEvent) => {
      dragOffset = moveEvent.clientY - startY;
      const slots = Math.round(dragOffset / rowStride);
      dropIndex = Math.min(Math.max(index + slots, 0), sets.length - 1);
    };
    const onEnd = () => {
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onEnd);
      grip.removeEventListener("pointercancel", onEnd);
      const to = dropIndex;
      dragIndex = undefined;
      dragOffset = 0;
      if (to !== index) onreorder(moveItem(sets, index, to), sets[index].id);
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onEnd);
    grip.addEventListener("pointercancel", onEnd);
  }

  function onGripKeydown(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step === 0) return;
    // Claim the key even at the ends of the list, or it scrolls the page away.
    event.preventDefault();
    const to = index + step;
    if (to < 0 || to >= sets.length) return;
    onreorder(moveItem(sets, index, to), sets[index].id);
  }
</script>

<p class="hint">
  <GripVertical size={12} /> Dra i håndtaket for å endre rekkefølge
</p>

<div class="rows" class:is-dragging={dragIndex !== undefined}>
  {#each sets as set, index (set.id)}
    <div
      class="row"
      class:dragging={dragIndex === index}
      class:moved={movedId === set.id}
      style:transform={rowTransform(index)}
    >
      <span class="number">{rowNumber(index)}</span>
      <span class="body">
        <span class="title">{set.title}</span>
        <span class="composer">{set.composer ?? "—"}</span>
      </span>
      <button
        class="grip"
        aria-label={`Flytt ${set.title ?? ""} — dra, eller bruk piltastene`}
        onpointerdown={(event) => startDrag(event, index)}
        onkeydown={(event) => onGripKeydown(event, index)}
      >
        <GripVertical size={20} />
      </button>
    </div>
  {/each}
</div>

<style>
  .hint {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 12px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-muted);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 11px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    /* Vertical scrolling still belongs to the page, except on the grip. */
    touch-action: pan-y;
  }
  .rows.is-dragging .row {
    transition: transform 160ms var(--ease-out);
  }
  /* The dragged row tracks the finger, so it must not lag behind a transition. */
  .rows.is-dragging .row.dragging {
    position: relative;
    z-index: 5;
    transition: none;
    border-color: var(--accent);
    box-shadow: var(--shadow-lg);
  }
  .row.moved {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--white);
    background: var(--ink-900);
    border-radius: var(--radius-full);
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .title,
  .composer {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15px;
    line-height: 1.2;
  }
  .composer {
    margin-top: 3px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .grip {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: grab;
    touch-action: none;
  }
  .grip:active,
  .row.dragging .grip {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
