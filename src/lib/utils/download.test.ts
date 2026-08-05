import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sheetMusic } from "$lib/api/sheetMusic";
import { downloadPdf, downloadSetZip, fetchSetPartPdf } from "./download";

vi.mock("$lib/api/sheetMusic", () => ({
  sheetMusic: {
    getZipToken: vi.fn(),
    getPartPdf: vi.fn(),
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
 * The preview modal fetches through this directly (no forced save) so it can
 * render the blob inline and hand the same one to a download/share action
 * afterwards without spending a second one-time token.
 */
describe("fetchSetPartPdf", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns the blob when the token is granted", async () => {
    const blob = new Blob(["pdf"]);
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });
    getPartPdf.mockResolvedValue(blob);

    const result = await fetchSetPartPdf("set-1", "Kornett 1");

    expect(result).toEqual({ status: "ok", blob });
    expect(getPartPdf).toHaveBeenCalledWith("set-1", "Kornett 1", "token-1");
  });

  it("reports 'forbidden' and asks for nothing more when the set is refused", async () => {
    getZipToken.mockResolvedValue({ status: "forbidden" });

    expect(await fetchSetPartPdf("set-1", "Kornett 1")).toEqual({
      status: "forbidden",
    });
    expect(getPartPdf).not.toHaveBeenCalled();
  });

  it("reports 'failed' when the PDF doesn't arrive", async () => {
    getZipToken.mockResolvedValue({ status: "ok", data: "token-1" });
    getPartPdf.mockResolvedValue(undefined);

    expect(await fetchSetPartPdf("set-1", "Kornett 1")).toEqual({
      status: "failed",
    });
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
