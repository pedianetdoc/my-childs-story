// @vitest-environment node
import { Packer } from 'docx';
import { strFromU8, unzipSync } from 'fflate';
import { filledDraft } from '../test/draftFixture';
import { buildDocx } from './docx';
import { EXPORT_HEADINGS, EXPORT_LABEL, buildExportDocument } from './exportDocument';

const NOW = new Date(2026, 10, 22);

async function documentText(includeOriginalNarrative: boolean, activity = filledDraft().activity) {
  const blocks = buildExportDocument(filledDraft({ includeOriginalNarrative, activity }), NOW);
  const buffer = await Packer.toBuffer(buildDocx(blocks));
  const xml = strFromU8(unzipSync(new Uint8Array(buffer))['word/document.xml'] as Uint8Array);
  // Text of each paragraph, in order.
  return Array.from(xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)).map((p) =>
    Array.from(p[0].matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g))
      .map((t) => t[1])
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

describe('DOCX export', () => {
  it('AC-12: contains the label, categories, answers, parent fields and activity', async () => {
    const paragraphs = await documentText(false);
    expect(paragraphs[0]).toBe('My Child’s Story');
    expect(paragraphs).toContain(EXPORT_LABEL);
    expect(paragraphs).toEqual(
      expect.arrayContaining([
        'Main Concerns',
        'He loves stacking blocks.',
        'Answer: Mama, dede and ball.',
        'How can we help him talk more?',
        'A plan we can use at home.',
        'Status: Tried it',
        'Notes: He pointed at the ball.',
      ]),
    );
  });

  it('AC-12: omits an unselected activity', async () => {
    const paragraphs = await documentText(false, null);
    expect(paragraphs).not.toContain(EXPORT_HEADINGS.activity);
  });

  it('AC-13: original narrative absent when unchecked; exact text at the end when checked', async () => {
    expect((await documentText(false)).join('\n')).not.toContain('Señor Niño');
    const paragraphs = await documentText(true);
    const start = paragraphs.indexOf(EXPORT_HEADINGS.appendix);
    expect(start).toBeGreaterThan(0);
    expect(paragraphs.slice(start + 1).join('\n')).toBe(filledDraft().originalNarrative);
  });

  it('keeps markup-like text as plain text', async () => {
    const draft = filledDraft();
    draft.parentQuestions = '<b>bold?</b> & "quotes"';
    const buffer = await Packer.toBuffer(buildDocx(buildExportDocument(draft, NOW)));
    const xml = strFromU8(unzipSync(new Uint8Array(buffer))['word/document.xml'] as Uint8Array);
    expect(xml).toContain('&lt;b&gt;bold?&lt;/b&gt; &amp;');
    expect(xml).not.toContain('<b>bold?</b>');
  });
});
