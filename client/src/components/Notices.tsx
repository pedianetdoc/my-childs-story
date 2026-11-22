import { FICTIONAL_DATA_NOTICE, SAFETY_NOTICE } from '../content/notices';

/** Fictional-data notice and static safety notice (spec 5, AC-19). Static, never AI-triggered. */
export function Notices() {
  return (
    <div className="notices">
      <aside className="notice notice-fictional" aria-label="Fictional data only">
        <p>{FICTIONAL_DATA_NOTICE}</p>
      </aside>
      <aside className="notice notice-safety" aria-label="Safety notice">
        <p>{SAFETY_NOTICE}</p>
      </aside>
    </div>
  );
}
