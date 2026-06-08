/**
 * Trigger a browser download of a PDF blob. Replaces the duplicated
 * `showPdf` helpers that lived in two route components (and drops the
 * obsolete IE11 `msSaveOrOpenBlob` branch).
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const url = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
}
