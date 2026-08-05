import { sheetMusic } from "$lib/api/sheetMusic";

/**
 * How a download ended. `forbidden` is the roles refusing the set — the notes
 * are not this user's to download — and is worth saying apart from a download
 * that simply failed. Callers show one message or the other; neither describes
 * the set, since a refused download tells us nothing about it.
 */
export type DownloadOutcome = "done" | "forbidden" | "failed";

/** The outcome of fetching a part's PDF, carrying the blob when it landed. */
export type PartPdfResult =
  | { status: "ok"; blob: Blob }
  | { status: "forbidden" }
  | { status: "failed" };

/**
 * Fetch a single part's PDF via a fresh one-time download token. Shared by the
 * preview modal — which renders the blob inline and offers it for download or
 * sharing without spending a second token — and `downloadSetPart` below.
 */
export async function fetchSetPartPdf(
  setId: string,
  partName: string,
): Promise<PartPdfResult> {
  const token = await sheetMusic.getZipToken(setId);
  if (token.status !== "ok")
    return { status: token.status === "forbidden" ? "forbidden" : "failed" };

  const blob = await sheetMusic.getPartPdf(setId, partName, token.data);
  if (!blob) return { status: "failed" };
  return { status: "ok", blob };
}

/** Trigger a browser download of a PDF blob. */
export function downloadPdf(blob: Blob, filename: string): void {
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const url = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

/**
 * Fetch a single part's PDF (via a one-time download token) and download it as
 * `{setTitle} - {partName}.pdf`.
 */
export async function downloadSetPart(
  setId: string,
  partName: string,
  setTitle: string,
): Promise<DownloadOutcome> {
  const result = await fetchSetPartPdf(setId, partName);
  if (result.status !== "ok") return result.status;

  downloadPdf(result.blob, `${setTitle} - ${partName}.pdf`);
  return "done";
}

/** Download the whole set as a ZIP (token appended to the set's zip URL). */
export async function downloadSetZip(
  setId: string,
  zipUrl: string,
): Promise<DownloadOutcome> {
  const token = await sheetMusic.getZipToken(setId);
  // Navigating without one would only swap this failure for a rejected
  // download, and take the user off the page to do it.
  if (token.status !== "ok")
    return token.status === "forbidden" ? "forbidden" : "failed";

  window.location.assign(`${zipUrl}?downloadToken=${token.data}`);
  return "done";
}
