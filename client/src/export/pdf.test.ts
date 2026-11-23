// @vitest-environment node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { filledDraft } from '../test/draftFixture';
import { EXPORT_HEADINGS, EXPORT_LABEL, buildExportDocument } from './exportDocument';
import { PAGE, layoutPdf, renderPdf, wrapText, type LaidOutLine } from './pdf';

const NOW = new Date(2026, 10, 22);
const require = createRequire(import.meta.url);
const fontDir = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const fonts = {
  regular: fs.readFileSync(path.join(fontDir, 'DejaVuSans.ttf')),
  bold: fs.readFileSync(path.join(fontDir, 'DejaVuSans-Bold.ttf')),
};

/** Simple monospace-like measure: 0.5 × size per code point. */
const measure = (text: string, size: number) => Array.from(text).length * size * 0.5;

const allLines = (pages: LaidOutLine[][]) => pages.flat();

/** Rebuilds each block's text from its wrapped lines (lines were split on single spaces). */
function blockTexts(pages: LaidOutLine[][]): Map<number, string> {
  const map = new Map<number, string[]>();
  for (const line of allLines(pages)) map.set(line.block, [...(map.get(line.block) ?? []), line.text]);
  return new Map(Array.from(map, ([k, v]) => [k, v.join(' ')]));
}

describe('wrapText', () => {
  it('wraps on spaces and never exceeds the width', () => {
    const lines = wrapText('one two three four five six', 10, (s) => s.length);
    expect(lines).toEqual(['one two', 'three four', 'five six']);
  });

  it('splits a word longer than a line instead of clipping it', () => {
    expect(wrapText('abcdefghij', 4, (s) => s.length)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('keeps an empty line as one empty line', () => {
    expect(wrapText('', 10, (s) => s.length)).toEqual(['']);
  });
});

describe('PDF layout', () => {
  it('AC-12: keeps every block’s full text, in order, within the page width', () => {
    const blocks = buildExportDocument(filledDraft({ includeOriginalNarrative: true }), NOW);
    const pages = layoutPdf(blocks, measure);
    const rebuilt = blockTexts(pages);
    blocks.forEach((block, i) => expect(rebuilt.get(i)).toBe(block.text));
    for (const line of allLines(pages)) {
      expect(line.x + measure(line.text, line.size)).toBeLessThanOrEqual(PAGE.width - PAGE.margin + 0.001);
    }
  });

  it('paginates long documents with nothing below the bottom margin', () => {
    const long = 'Mahilig siyang sumayaw kapag may music at masaya siya. '.repeat(90).trim();
    const blocks = buildExportDocument(filledDraft({ includeOriginalNarrative: true, originalNarrative: long }), NOW);
    const pages = layoutPdf(blocks, measure);
    expect(pages.length).toBeGreaterThan(1);
    for (const line of allLines(pages)) {
      expect(line.y).toBeGreaterThanOrEqual(PAGE.margin);
      expect(line.y).toBeLessThanOrEqual(PAGE.height - PAGE.margin);
    }
    expect(blockTexts(pages).get(blocks.length - 1)).toBe(long);
  });

  it('AC-13: appendix is the last content when checked, and absent when unchecked', () => {
    const withAppendix = allLines(layoutPdf(buildExportDocument(filledDraft({ includeOriginalNarrative: true }), NOW), measure));
    const headingIndex = withAppendix.findIndex((l) => l.text === EXPORT_HEADINGS.appendix);
    expect(headingIndex).toBeGreaterThan(0);
    expect(withAppendix.slice(headingIndex + 1).every((l) => l.kind === 'paragraph')).toBe(true);

    const without = allLines(layoutPdf(buildExportDocument(filledDraft(), NOW), measure));
    expect(without.some((l) => l.text === EXPORT_HEADINGS.appendix)).toBe(false);
  });
});

describe('PDF rendering with an embedded Unicode font', () => {
  it('AC-12: renders a valid PDF including Filipino characters (ñ, Ñ) and the label', async () => {
    const draft = filledDraft({ includeOriginalNarrative: true, visitExpectations: 'ÑAÑA at Señor Niño — “salamat”' });
    const bytes = await renderPdf(buildExportDocument(draft, NOW), fonts);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdf.getTitle()).toBe('My Child’s Story');
    // Subset embedding keeps the file small.
    expect(bytes.length).toBeLessThan(200_000);
    const layout = layoutPdf(buildExportDocument(draft, NOW), measure);
    expect(allLines(layout).some((l) => l.text === EXPORT_LABEL || EXPORT_LABEL.startsWith(l.text))).toBe(true);
  });
});
