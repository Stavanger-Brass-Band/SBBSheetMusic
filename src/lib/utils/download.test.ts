import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sheetMusic } from "$lib/api/sheetMusic";
import {
  downloadPdf,
  downloadSetPart,
  downloadSetZip,
  openSetPartInBrowser,
} from "./download";

vi.mock("$lib/api/sheetMusic", () => ({
  sheetMusic: {
    getZipToken: vi.fn(),
    getPartPdf: vi.fn(),
    partPdfUrl: vi.fn(
      (setId: string, partName: string, token: string) =>
        `https://api/sheetmusic/sets/${setId}/parts/${partName}/pdf?downloadToken=${token}`,
    ),
  },
}));

const getZipToken = vi.mocked(sheetMusic.getZipToken);
const getPartPdf = vi.mocked(sheetMusic.getPartPdf);

describe("downloadPdf", () => {
  // A stand-in for the anchor the helper clicks to save the PDF.
  let link: { href: string; download: string; click: () => void };

  beforeEach(() => {
    link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("window", {
      URL: { createObjectURL: () => "blob:pdf", revokeObjectURL: vi.fn() },
    });
    vi.stubGlobal("document", { createElement: () => link });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("clicks a hidden anchor under the given filename", () => {
    downloadPdf(new Blob(["pdf"]), "Fanfare - Kornett 1.pdf");

    expect(link.href).toBe("blob:pdf");
    expect(link.download).toBe("Fanfare - Kornett 1.pdf");
    expect(link.click).toHaveBeenCalled();
  });
});

/**
 * The download helpers are the only place a member's download can be refused —
 * the token endpoint applies the same role scope as the reads — so the outcome
 * they report is what the pages turn into "no access" rather than "failed".
 */
describe("downloadSetPart", () => {
  let link: { href: string; download: string; click: () => void };

  beforeEach(() => {
    link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("window", {
      URL: { createObjectURL: () => "blob:pdf", revokeObjectURL: vi.fn() },
      location: { assign: vi.fn() },
    });
    vi.stubGlobal("document", { createElement: () => link });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("saves the PDF under '{set} - {part}.pdf' when the token is granted", async () => {
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });
    getPartPdf.mockResolvedValue(new Blob(["pdf"]));

    const outcome = await downloadSetPart("set-1", "Kornett 1", "Fanfare");

    expect(outcome).toBe("done");
    expect(getPartPdf).toHaveBeenCalledWith("set-1", "Kornett 1", "token-1");
    expect(link.download).toBe("Fanfare - Kornett 1.pdf");
    expect(link.click).toHaveBeenCalled();
  });

  it("reports 'forbidden' and asks for nothing more when the set is refused", async () => {
    getZipToken.mockResolvedValue({ status: "forbidden" });

    expect(await downloadSetPart("set-1", "Kornett 1", "Fanfare")).toBe(
      "forbidden",
    );
    expect(getPartPdf).not.toHaveBeenCalled();
  });

  it("reports 'failed' when the PDF doesn't arrive", async () => {
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });
    getPartPdf.mockResolvedValue(undefined);

    expect(await downloadSetPart("set-1", "Kornett 1", "Fanfare")).toBe(
      "failed",
    );
    expect(link.click).not.toHaveBeenCalled();
  });
});

/**
 * Opening in the browser needs a blank tab up front (before the token fetch)
 * so Safari doesn't treat the later navigation as a blocked popup.
 */
describe("openSetPartInBrowser", () => {
  let newTab: { location: { href: string }; close: () => void };
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    newTab = { location: { href: "" }, close: vi.fn() };
    open = vi.fn(() => newTab);
    vi.stubGlobal("window", {
      open,
      URL: { createObjectURL: () => "blob:pdf", revokeObjectURL: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("opens a blank tab up front, then points it at the tokened PDF URL", async () => {
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });

    const outcome = await openSetPartInBrowser("set-1", "Kornett 1", "Fanfare");

    expect(outcome).toBe("done");
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(newTab.location.href).toBe(
      "https://api/sheetmusic/sets/set-1/parts/Kornett 1/pdf?downloadToken=token-1",
    );
    expect(getPartPdf).not.toHaveBeenCalled();
  });

  it("closes the blank tab and reports 'forbidden' when the set is refused", async () => {
    getZipToken.mockResolvedValue({ status: "forbidden" });

    expect(await openSetPartInBrowser("set-1", "Kornett 1", "Fanfare")).toBe(
      "forbidden",
    );
    expect(newTab.close).toHaveBeenCalled();
  });

  it("falls back to a normal download when popups are blocked outright", async () => {
    open.mockReturnValue(null);
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });
    getPartPdf.mockResolvedValue(new Blob(["pdf"]));
    const link = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: () => link });

    const outcome = await openSetPartInBrowser("set-1", "Kornett 1", "Fanfare");

    expect(outcome).toBe("done");
    expect(link.download).toBe("Fanfare - Kornett 1.pdf");
    expect(link.click).toHaveBeenCalled();
  });
});

describe("downloadSetZip", () => {
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("navigates to the zip URL carrying the token", async () => {
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });

    const outcome = await downloadSetZip("set-1", "https://api/sets/1/zip");

    expect(outcome).toBe("done");
    expect(assign).toHaveBeenCalledWith(
      "https://api/sets/1/zip?downloadToken=token-1",
    );
  });

  it("stays on the page when the set is refused", async () => {
    getZipToken.mockResolvedValue({ status: "forbidden" });

    expect(await downloadSetZip("set-1", "https://api/sets/1/zip")).toBe(
      "forbidden",
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("stays on the page when the token request failed", async () => {
    getZipToken.mockResolvedValue({ status: "failed" });

    expect(await downloadSetZip("set-1", "https://api/sets/1/zip")).toBe(
      "failed",
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
