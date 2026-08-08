import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sheetMusic } from "$lib/api/sheetMusic";
import { downloadSetPart, downloadSetZip } from "./download";

vi.mock("$lib/api/sheetMusic", () => ({
  sheetMusic: {
    getZipToken: vi.fn(),
    getPartPdf: vi.fn(),
  },
}));

const getZipToken = vi.mocked(sheetMusic.getZipToken);
const getPartPdf = vi.mocked(sheetMusic.getPartPdf);

/**
 * The download helpers are the only place a member's download can be refused —
 * the token endpoint applies the same role scope as the reads — so the outcome
 * they report is what the pages turn into "no access" rather than "failed".
 */
describe("downloadSetPart", () => {
  // A stand-in for the anchor the helper clicks to save the PDF.
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

  it("reports 'failed' when the token request itself failed", async () => {
    getZipToken.mockResolvedValue({ status: "failed" });

    expect(await downloadSetPart("set-1", "Kornett 1", "Fanfare")).toBe(
      "failed",
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

  // Tokens are consumed by the download that presents them, so every part has
  // to fetch its own — reusing one would be rejected as replay.
  it("fetches a fresh token per part", async () => {
    getZipToken
      .mockResolvedValueOnce({ status: "ok", data: "token-1" })
      .mockResolvedValueOnce({ status: "ok", data: "token-2" });
    getPartPdf.mockResolvedValue(new Blob(["pdf"]));

    await downloadSetPart("set-1", "Kornett 1", "Fanfare");
    await downloadSetPart("set-1", "Kornett 2", "Fanfare");

    expect(getZipToken).toHaveBeenCalledTimes(2);
    expect(getPartPdf).toHaveBeenNthCalledWith(
      2,
      "set-1",
      "Kornett 2",
      "token-2",
    );
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
