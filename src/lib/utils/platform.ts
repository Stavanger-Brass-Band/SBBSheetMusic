/**
 * Naming a keyboard shortcut for the keyboard the reader actually has.
 *
 * Only the *label* needs this. What is listened for is `metaKey || ctrlKey`
 * (see `QuickJump`), so the shortcut itself works on either kind of keyboard
 * whatever this answers — a wrong guess here misnames a key, it never breaks
 * one.
 */

/**
 * How to write `Ctrl`/`⌘` plus `key` for this user agent: `⌘K` on Apple
 * hardware, `Ctrl+K` everywhere else.
 *
 * Sniffing the user agent is the crude option, and the right one here: the
 * question is which glyph is printed on the reader's modifier key, which is
 * hardware, and no feature detection answers it. `navigator.platform` would do
 * as well but is deprecated, and `userAgentData` isn't in Safari.
 *
 * iPadOS reports itself as `Macintosh`, and that reads as Apple on purpose: an
 * iPad with a keyboard attached has a ⌘ key. One without has no shortcut to
 * press at all and reaches Quick jump by the button, so the hint it can't use is
 * only ever a hint it doesn't need.
 */
export function shortcutLabel(key: string, userAgent: string): string {
  return isApplePlatform(userAgent) ? `⌘${key}` : `Ctrl+${key}`;
}

/**
 * Whether this user agent is Apple hardware. Matched on the platform tokens
 * inside the parenthesised part of the string — `Macintosh`, `iPhone`, `iPad`,
 * `iPod` — and deliberately not on `Apple`, which every Chromium and WebKit
 * agent carries in `AppleWebKit` regardless of what it runs on.
 */
function isApplePlatform(userAgent: string): boolean {
  return /\b(Macintosh|Mac OS X|iPhone|iPad|iPod)\b/.test(userAgent);
}
