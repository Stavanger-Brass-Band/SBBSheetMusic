// Ordering helpers for the drag-and-drop lists. Both are pure — callers assign
// the result back to state so Svelte sees a new array reference.

/**
 * Move the item at `from` to `to`, where `to` is the index it should end up at
 * once the item has been lifted out of the list (`splice` semantics).
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** True when both lists hold the same items in the same positions. */
export function isSameOrder(
  a: { id?: string }[],
  b: { id?: string }[],
): boolean {
  return (
    a.length === b.length && a.every((item, index) => item.id === b[index].id)
  );
}
