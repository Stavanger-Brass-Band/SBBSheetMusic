/**
 * The one part of the list-page query state that navigates.
 *
 * It lives apart from `listQuery` so that module stays pure: everything else
 * about a view — reading it out of a URL, sorting, paging — is plain data the
 * unit tests reach directly, and importing `$app/navigation` there would put
 * the SvelteKit runtime between them and the test (the suite runs without the
 * SvelteKit plugin, see `vitest.config.ts`).
 */

import { goto } from "$app/navigation";

/**
 * Writes a view back into the URL, replacing the current history entry so
 * searching, sorting and paging never fill the back stack. `params` is the
 * already-encoded `key=value` pairs the view consists of; an empty list falls
 * back to `pathname`, leaving the bare list URL.
 *
 * This has to be a real navigation and **not** `replaceState`: shallow routing
 * parks the pre-call URL in the history entry (`sveltekit:pageurl`) and
 * restores that one on a back navigation, so coming back from a set would show
 * the params in the address bar while the page rebuilt itself from an empty
 * query. `replaceState` doesn't update `page.url` either, so the params would be
 * invisible to the page that just wrote them. `noScroll` and `keepFocus` keep
 * this in-place update from jumping to the top of the list or dropping focus
 * while the reader is still typing in the search field.
 */
export function replaceListUrl(params: string[], pathname: string): void {
  void goto(params.length ? `?${params.join("&")}` : pathname, {
    replaceState: true,
    noScroll: true,
    keepFocus: true,
  });
}
