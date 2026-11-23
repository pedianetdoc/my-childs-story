/**
 * "Download My Draft" — a plain-text copy of everything in the draft, clearly
 * marked as a draft (spec section 5 step 7). Import is out of scope.
 */
import type { Draft } from './draft';
import { buildExportDocument, type ExportBlock } from '../export/exportDocument';
import { sanitizeBaseName } from '../export/fileName';

export const DRAFT_HEADER = [
  'DRAFT — not a final document.',
  'This is a copy of your work in progress from My Child’s Story. It cannot be loaded back into the app.',
];

function blockLine(block: ExportBlock): string[] {
  switch (block.kind) {
    case 'title':
      return [block.text.toUpperCase(), ''];
    case 'heading':
      return ['', block.text, '-'.repeat(Array.from(block.text).length)];
    case 'subheading':
      return ['', block.text];
    case 'bullet':
      return [`- ${block.text}`];
    case 'label':
      return [block.text, ''];
    default:
      return [block.text];
  }
}

export function buildDraftText(draft: Draft, now: Date): string {
  // The draft copy always includes the original story, organized or not.
  const blocks = buildExportDocument({ ...draft, includeOriginalNarrative: true }, now);
  const body = blocks.flatMap(blockLine);
  return [...DRAFT_HEADER, '', ...body, ''].join('\n');
}

/** e.g. story-2026-11-22-draft.txt, from the same (sanitized) base name as the exports. */
export function draftFileName(draft: Draft, now: Date): string {
  return `${sanitizeBaseName(draft.exportBaseName, now)}-draft.txt`;
}
