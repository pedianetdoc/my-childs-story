/**
 * DOCX rendering of the export blocks (spec 4.8). Runs in the browser. All
 * strings go in as plain text runs; the library escapes them.
 */
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ExportBlock } from './exportDocument';

const FONT = 'Calibri';

function paragraph(block: ExportBlock): Paragraph {
  switch (block.kind) {
    case 'title':
      return new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: block.text })] });
    case 'meta':
      return new Paragraph({ children: [new TextRun({ text: block.text })] });
    case 'label':
      return new Paragraph({
        spacing: { before: 120, after: 240 },
        children: [new TextRun({ text: block.text, bold: true })],
      });
    case 'heading':
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        children: [new TextRun({ text: block.text })],
      });
    case 'subheading':
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        keepNext: true,
        children: [new TextRun({ text: block.text })],
      });
    case 'bullet':
      return new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: block.text })] });
    case 'paragraph':
      return new Paragraph({ children: [new TextRun({ text: block.text })] });
  }
}

export function buildDocx(blocks: ExportBlock[]): Document {
  return new Document({
    creator: 'My Child’s Story',
    title: 'My Child’s Story',
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ children: blocks.map(paragraph) }],
  });
}

export async function renderDocx(blocks: ExportBlock[]): Promise<Blob> {
  return Packer.toBlob(buildDocx(blocks));
}
