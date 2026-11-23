/**
 * DejaVu Sans (free license, Unicode coverage including ñ/Ñ) for the PDF.
 * Vite copies the TTF files into the build; they are fetched only on download.
 */
import boldUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';
import regularUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import type { FontBytes } from './pdf';

let cache: Promise<FontBytes> | null = null;

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`font download failed (${response.status})`);
  return response.arrayBuffer();
}

export function loadPdfFonts(): Promise<FontBytes> {
  cache ??= Promise.all([fetchBytes(regularUrl), fetchBytes(boldUrl)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error: unknown) => {
      cache = null; // allow a retry
      throw error;
    });
  return cache;
}
