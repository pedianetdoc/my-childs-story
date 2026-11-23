import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { App } from './App';
import { DOWNLOAD_ERROR, INCLUDE_ORIGINAL_HELP, INCLUDE_ORIGINAL_LABEL } from './export/ExportPanel';
import { downloadPdf, downloadWord } from './export/exporters';
import { fillValidStory, jsonResponse, mockFetch, sampleResult, STORY } from './test/helpers';

vi.mock('./export/exporters', () => ({
  downloadWord: vi.fn(async () => 'file.docx'),
  downloadPdf: vi.fn(async () => 'file.pdf'),
  saveBlob: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 22, 10, 0)); // local 2026-11-22
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(downloadWord).mockClear();
  vi.mocked(downloadPdf).mockClear();
});

async function toPreview() {
  mockFetch(jsonResponse(200, sampleResult()));
  render(<App />);
  fillValidStory();
  fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
  await screen.findByRole('heading', { name: 'Your organized story' });
}

describe('Download panel (spec 4.8)', () => {
  it('AC-13: "Also include everything I originally wrote" is unchecked by default, with its explanation', async () => {
    await toPreview();
    const box = screen.getByRole('checkbox', { name: INCLUDE_ORIGINAL_LABEL });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription(INCLUDE_ORIGINAL_HELP);
  });

  it('AC-14: the file name defaults to story-YYYY-MM-DD and is editable and sanitized', async () => {
    await toPreview();
    const name = screen.getByLabelText('File name');
    expect(name).toHaveValue('story-2026-11-22');
    expect(screen.getByText('Saved as story-2026-11-22.docx and story-2026-11-22.pdf')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'appointment: dr/visit' } });
    expect(screen.getByText('Saved as visit.docx and visit.pdf')).toBeInTheDocument();
  });

  it('AC-12: Word and PDF are generated from the same current draft', async () => {
    await toPreview();
    fireEvent.change(screen.getByLabelText('Questions you want to ask the doctor'), { target: { value: 'Q?' } });
    fireEvent.click(screen.getByRole('checkbox', { name: INCLUDE_ORIGINAL_LABEL }));
    fireEvent.click(screen.getByRole('button', { name: 'Download Word' }));
    await screen.findByText('Downloaded file.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await screen.findByText('Downloaded file.pdf');

    const wordDraft = vi.mocked(downloadWord).mock.calls[0]?.[0];
    const pdfDraft = vi.mocked(downloadPdf).mock.calls[0]?.[0];
    expect(wordDraft).toEqual(pdfDraft);
    expect(wordDraft).toMatchObject({
      parentQuestions: 'Q?',
      includeOriginalNarrative: true,
      originalNarrative: STORY,
    });
  });

  it('shows a friendly error if a file cannot be created, and keeps everything', async () => {
    vi.mocked(downloadPdf).mockRejectedValueOnce(new Error('font fetch failed: internal'));
    await toPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(DOWNLOAD_ERROR);
    expect(document.body).not.toHaveTextContent('internal');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled());
  });
});
