import { prefersReducedMotion } from "svelte/motion";
import type { FlipParams } from "svelte/animate";
import type { FlyParams } from "svelte/transition";

// Shared, reduced-motion-aware entrance motion. The OS "reduce motion" setting
// collapses every duration/delay to 0, so callers can use these unconditionally
// (CSS transitions are handled separately by the guard in app.css).

/** Staggered fade-up for grid/list items. The stagger is capped so a long list
 *  never makes the last items crawl in. */
export function cardEnter(index: number): FlyParams {
  const reduce = prefersReducedMotion.current;
  return {
    y: 10,
    duration: reduce ? 0 : 240,
    delay: reduce ? 0 : Math.min(index, 7) * 45,
  };
}

/** Short fade for page-level content on navigation. */
export function pageFade(): { duration: number } {
  return { duration: prefersReducedMotion.current ? 0 : 150 };
}

/** Slide items to their new places when a keyed list is reordered. */
export function reorderFlip(): FlipParams {
  return { duration: prefersReducedMotion.current ? 0 : 220 };
}

/** Nudge a toast up into view, and back down on the way out. */
export function toastEnter(): FlyParams {
  return { y: 10, duration: prefersReducedMotion.current ? 0 : 200 };
}
