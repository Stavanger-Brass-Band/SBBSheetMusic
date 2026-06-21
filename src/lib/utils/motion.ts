import { prefersReducedMotion } from "svelte/motion";
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
