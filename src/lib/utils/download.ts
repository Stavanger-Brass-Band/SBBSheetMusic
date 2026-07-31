import { sheetMusic } from "$lib/api/sheetMusic";

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
): Promise<void> {
  const token = await sheetMusic.getZipToken(setId);
  if (!token) return;
  const blob = await sheetMusic.getPartPdf(setId, partName, token);
  if (!blob) return;
  downloadPdf(blob, `${setTitle} - ${partName}.pdf`);
}

/** Download the whole set as a ZIP (token appended to the set's zip URL). */
export async function downloadSetZip(
  setId: string,
  zipUrl: string,
): Promise<void> {
  const token = await sheetMusic.getZipToken(setId);
  // Navigating without one would only swap this failure for a rejected
  // download, and take the user off the page to do it.
  if (!token) return;
  window.location.assign(`${zipUrl}?downloadToken=${token}`);
}
