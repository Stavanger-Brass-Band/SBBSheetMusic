import { describe, expect, it } from "vitest";
import { shortcutLabel } from "./platform";

/**
 * Real user-agent strings, because the trap here is a substring: every Chromium
 * and WebKit agent says `AppleWebKit` whatever hardware it runs on, so a naive
 * match on "Apple" — or on "Mac" without a word boundary — puts ⌘ on a Windows
 * keyboard.
 */
const AGENTS = {
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  windowsFirefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  linuxChrome:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  iPhone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  iPadMobile:
    "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  // iPadOS in its default desktop mode reports itself as a Mac — which is the
  // right answer anyway, since an iPad with a keyboard has a ⌘ key.
  iPadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
};

describe("shortcutLabel", () => {
  it("says Ctrl on Windows, in every browser", () => {
    expect(shortcutLabel("K", AGENTS.windowsChrome)).toBe("Ctrl+K");
    expect(shortcutLabel("K", AGENTS.windowsEdge)).toBe("Ctrl+K");
    expect(shortcutLabel("K", AGENTS.windowsFirefox)).toBe("Ctrl+K");
  });

  it("says Ctrl on Linux and Android", () => {
    expect(shortcutLabel("K", AGENTS.linuxChrome)).toBe("Ctrl+K");
    expect(shortcutLabel("K", AGENTS.androidChrome)).toBe("Ctrl+K");
  });

  it("says ⌘ on a Mac", () => {
    expect(shortcutLabel("K", AGENTS.macSafari)).toBe("⌘K");
    expect(shortcutLabel("K", AGENTS.macChrome)).toBe("⌘K");
  });

  it("says ⌘ on iPhone and iPad, in either mode", () => {
    expect(shortcutLabel("K", AGENTS.iPhone)).toBe("⌘K");
    expect(shortcutLabel("K", AGENTS.iPadMobile)).toBe("⌘K");
    expect(shortcutLabel("K", AGENTS.iPadDesktopMode)).toBe("⌘K");
  });

  it("falls back to Ctrl when there is no user agent to read", () => {
    expect(shortcutLabel("K", "")).toBe("Ctrl+K");
  });
});
