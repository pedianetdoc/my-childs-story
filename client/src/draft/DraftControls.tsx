/**
 * Draft continuity controls — spec section 5 step 7 (AC-15). Never claims the
 * work is safely or permanently saved.
 */
import { useEffect, useRef, useState } from 'react';
import { saveBlob } from '../export/exporters';
import type { Draft } from './draft';
import { buildDraftText, draftFileName } from './draftText';

export const DRAFT_NOTE =
  'While this tab stays open, your draft is kept in this browser tab, so refreshing the page ' +
  'usually keeps it. Closing the tab, private browsing or clearing browser data can remove it. ' +
  'Download your files to keep them.';

export const STORAGE_UNAVAILABLE =
  'This browser is not keeping a copy of your draft, so refreshing the page may lose it. ' +
  'Download your files before you leave.';

export const CLEAR_WARNING =
  'This removes your story, your organized story, your answers and notes from this tab. ' +
  'Files you already downloaded are not affected.';

type Props = {
  draft: Draft;
  storageWorks: boolean;
  onClear: () => void;
};

export function DraftControls({ draft, storageWorks, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const downloadDraft = () => {
    const now = new Date();
    const blob = new Blob([buildDraftText(draft, now)], { type: 'text/plain;charset=utf-8' });
    saveBlob(blob, draftFileName(draft, now));
  };

  return (
    <footer className="draft-controls" aria-labelledby="draft-heading">
      <h2 id="draft-heading">Your draft</h2>
      <p className="hint">{storageWorks ? DRAFT_NOTE : STORAGE_UNAVAILABLE}</p>
      <div className="button-row">
        <button type="button" className="button button-secondary" onClick={downloadDraft}>
          Download My Draft (.txt)
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => setConfirming(true)}
          disabled={confirming}
        >
          Clear My Information
        </button>
      </div>
      {confirming && (
        <div
          className="confirm"
          role="alertdialog"
          aria-labelledby="clear-heading"
          aria-describedby="clear-text"
          tabIndex={-1}
          ref={confirmRef}
        >
          <h3 id="clear-heading">Clear your information?</h3>
          <p id="clear-text">{CLEAR_WARNING}</p>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setConfirming(false);
                onClear();
              }}
            >
              Yes, clear everything
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
