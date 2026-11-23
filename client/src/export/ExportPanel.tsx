/**
 * Download panel — spec 4.8 and section 5 step 6 (AC-12, AC-13, AC-14).
 * Word and PDF come from the same draft state.
 */
import { useState } from 'react';
import type { Draft } from '../draft/draft';
import { EXPORT_LABEL } from './exportDocument';
import { downloadPdf, downloadWord } from './exporters';
import { defaultBaseName, sanitizeBaseName } from './fileName';

export const INCLUDE_ORIGINAL_LABEL = 'Also include everything I originally wrote';
export const INCLUDE_ORIGINAL_HELP =
  'Add your full, unorganized description at the end of the document, so your doctor can read your exact words if needed.';
export const DOWNLOAD_ERROR =
  'We could not create the file this time. Your information is still here. Please try again.';

type Props = {
  draft: Draft;
  onChange: (patch: Partial<Pick<Draft, 'includeOriginalNarrative' | 'exportBaseName'>>) => void;
  /** Injectable clock for tests. */
  now?: () => Date;
};

export function ExportPanel({ draft, onChange, now = () => new Date() }: Props) {
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const today = now();
  const shownName = draft.exportBaseName === '' ? defaultBaseName(today) : draft.exportBaseName;
  const safeName = sanitizeBaseName(shownName, today);

  const download = async (kind: 'docx' | 'pdf') => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    setSaved(null);
    try {
      const fileName = await (kind === 'docx' ? downloadWord : downloadPdf)(draft, now());
      setSaved(fileName);
    } catch {
      setError(DOWNLOAD_ERROR);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="export" aria-labelledby="export-heading">
      <h3 id="export-heading">Download your story</h3>
      <p className="hint">
        The file is made on this device. It will say: “{EXPORT_LABEL}” Files you download are yours
        to keep and share.
      </p>

      <div className="checkbox-field">
        <input
          id="include-original"
          type="checkbox"
          checked={draft.includeOriginalNarrative}
          onChange={(e) => onChange({ includeOriginalNarrative: e.target.checked })}
          aria-describedby="include-original-help"
        />
        <div>
          <label htmlFor="include-original">{INCLUDE_ORIGINAL_LABEL}</label>
          <p className="hint" id="include-original-help">
            {INCLUDE_ORIGINAL_HELP}
          </p>
        </div>
      </div>

      <div className="field">
        <label htmlFor="export-name">File name</label>
        <input
          id="export-name"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={shownName}
          onChange={(e) => onChange({ exportBaseName: e.target.value })}
          aria-describedby="export-name-hint"
        />
        <p className="hint" id="export-name-hint">
          Saved as {safeName}.docx and {safeName}.pdf
        </p>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={() => void download('docx')}
          disabled={busy !== null}
        >
          {busy === 'docx' ? 'Preparing Word file…' : 'Download Word'}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void download('pdf')}
          disabled={busy !== null}
        >
          {busy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      {saved && (
        <p className="status" role="status">
          Downloaded {saved}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
