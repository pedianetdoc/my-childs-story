/**
 * Download actions. The DOCX and PDF libraries and the font are loaded only
 * when the parent asks for a file, so they do not slow the first page load.
 * Files are generated entirely in the browser; nothing is sent to the server.
 */
import type { Draft } from '../draft/draft';
import { buildExportDocument } from './exportDocument';
import { exportFileName } from './fileName';

/** Triggers a browser download for a generated file. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give slow browsers (e.g. iOS Safari) time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadWord(draft: Draft, now = new Date()): Promise<string> {
  const { renderDocx } = await import('./docx');
  const blob = await renderDocx(buildExportDocument(draft, now));
  const fileName = exportFileName(draft.exportBaseName, 'docx', now);
  saveBlob(blob, fileName);
  return fileName;
}

export async function downloadPdf(draft: Draft, now = new Date()): Promise<string> {
  const [{ renderPdf }, { loadPdfFonts }] = await Promise.all([import('./pdf'), import('./pdfFonts')]);
  const bytes = await renderPdf(buildExportDocument(draft, now), await loadPdfFonts());
  const fileName = exportFileName(draft.exportBaseName, 'pdf', now);
  saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), fileName);
  return fileName;
}
