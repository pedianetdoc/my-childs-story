/**
 * PDF rendering of the export blocks (spec 4.8). Embeds a Unicode TrueType
 * font (DejaVu Sans) so Filipino characters such as ñ and Ñ render. Long text
 * wraps and paginates; nothing is clipped.
 *
 * `layoutPdf` is pure (it only needs a width-measuring function), so line
 * wrapping and pagination are unit-tested without a browser.
 */
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import type { ExportBlock } from './exportDocument';

export const PAGE = { width: 595.28, height: 841.89, margin: 56 } as const; // A4, points

type Style = { size: number; bold: boolean; before: number; after: number; indent: number; lineGap: number };

const STYLES: Record<ExportBlock['kind'], Style> = {
  title: { size: 22, bold: true, before: 0, after: 8, indent: 0, lineGap: 1.25 },
  meta: { size: 11, bold: false, before: 0, after: 2, indent: 0, lineGap: 1.4 },
  label: { size: 11, bold: true, before: 8, after: 10, indent: 0, lineGap: 1.4 },
  heading: { size: 15, bold: true, before: 14, after: 6, indent: 0, lineGap: 1.3 },
  subheading: { size: 12, bold: true, before: 8, after: 3, indent: 0, lineGap: 1.35 },
  paragraph: { size: 11, bold: false, before: 0, after: 4, indent: 0, lineGap: 1.45 },
  bullet: { size: 11, bold: false, before: 0, after: 4, indent: 14, lineGap: 1.45 },
};

export type Measure = (text: string, size: number, bold: boolean) => number;

export type LaidOutLine = {
  text: string;
  x: number;
  /** Baseline, measured from the top of the page. */
  y: number;
  size: number;
  bold: boolean;
  kind: ExportBlock['kind'];
  /** Index of the block this line came from. */
  block: number;
  /** True for the first line of a bullet (draws the bullet mark). */
  bulletMark?: boolean;
};

/** Breaks one paragraph into lines that fit `width`; splits words longer than a line. */
export function wrapText(text: string, width: number, measure: (s: string) => number): string[] {
  if (text === '') return [''];
  const words = text.split(' ');
  const result: string[] = [];
  let line = '';
  const pushLongWord = (word: string) => {
    let part = '';
    for (const ch of Array.from(word)) {
      if (part && measure(part + ch) > width) {
        result.push(part);
        part = ch;
      } else {
        part += ch;
      }
    }
    return part;
  };
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (measure(candidate) <= width) {
      line = candidate;
      continue;
    }
    if (line !== '') result.push(line);
    line = measure(word) <= width ? word : pushLongWord(word);
  }
  result.push(line);
  return result;
}

export function layoutPdf(blocks: ExportBlock[], measure: Measure): LaidOutLine[][] {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const bottom = PAGE.height - PAGE.margin;
  const pages: LaidOutLine[][] = [[]];
  let y = PAGE.margin;

  const newPage = () => {
    pages.push([]);
    y = PAGE.margin;
  };

  blocks.forEach((block, index) => {
    const style = STYLES[block.kind];
    const lineHeight = style.size * style.lineGap;
    const width = contentWidth - style.indent;
    const wrapped = wrapText(block.text, width, (s) => measure(s, style.size, style.bold));

    const firstOnPage = (pages.at(-1) ?? []).length === 0;
    y += firstOnPage ? 0 : style.before;
    // Keep a heading together with at least two lines of what follows.
    const keepWith = block.kind === 'heading' || block.kind === 'subheading' ? lineHeight * 3 : 0;
    if (y + lineHeight + keepWith > bottom && !firstOnPage) newPage();

    wrapped.forEach((text, lineIndex) => {
      if (y + lineHeight > bottom) newPage();
      y += lineHeight;
      (pages.at(-1) as LaidOutLine[]).push({
        text,
        x: PAGE.margin + style.indent,
        y: y - (lineHeight - style.size),
        size: style.size,
        bold: style.bold,
        kind: block.kind,
        block: index,
        ...(block.kind === 'bullet' && lineIndex === 0 && { bulletMark: true }),
      });
    });
    y += style.after;
  });

  return pages.filter((page, i) => page.length > 0 || i === 0);
}

export type FontBytes = { regular: ArrayBuffer | Uint8Array; bold: ArrayBuffer | Uint8Array };

export async function renderPdf(blocks: ExportBlock[], fonts: FontBytes): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle('My Child’s Story');
  doc.setCreator('My Child’s Story');
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  const fontFor = (isBold: boolean): PDFFont => (isBold ? bold : regular);

  const pages = layoutPdf(blocks, (text, size, isBold) => fontFor(isBold).widthOfTextAtSize(text, size));
  const ink = rgb(0.12, 0.16, 0.2);
  pages.forEach((lines, pageIndex) => {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    for (const line of lines) {
      const font = fontFor(line.bold);
      const baseline = PAGE.height - line.y;
      if (line.bulletMark) page.drawText('•', { x: line.x - 11, y: baseline, size: line.size, font, color: ink });
      if (line.text) page.drawText(line.text, { x: line.x, y: baseline, size: line.size, font, color: ink });
    }
    const footer = `Page ${pageIndex + 1} of ${pages.length}`;
    const size = 9;
    page.drawText(footer, {
      x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(footer, size),
      y: PAGE.margin / 2,
      size,
      font: regular,
      color: rgb(0.4, 0.45, 0.5),
    });
  });

  return doc.save();
}
