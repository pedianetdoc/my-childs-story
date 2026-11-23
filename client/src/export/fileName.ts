/**
 * Export file names — spec 4.8 and AC-14. Default `story-YYYY-MM-DD` from the
 * browser's local date; parent-editable; paths and illegal characters removed.
 */
import { localIsoDate } from './exportDocument';

export function defaultBaseName(now: Date): string {
  return `story-${localIsoDate(now)}`;
}

const MAX_LENGTH = 100;
// Characters not allowed in file names on common systems, plus control characters.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[<>:"|?*\u0000-\u001f\u007f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Returns a safe base name (no extension). Falls back to the default when
 * nothing usable is left.
 */
export function sanitizeBaseName(input: string, now: Date): string {
  // Drop any directory part, for both / and \ separators.
  const withoutPath = input.split(/[/\\]/).pop() ?? '';
  let name = withoutPath
    .normalize('NFC')
    .replace(/\.(docx|pdf|txt)$/i, '')
    .replace(ILLEGAL, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s-]+|[.\s]+$/g, '');
  name = Array.from(name).slice(0, MAX_LENGTH).join('').trim();
  if (name === '') return defaultBaseName(now);
  if (RESERVED.test(name)) return `story-${name}`;
  return name;
}

export function exportFileName(input: string, extension: 'docx' | 'pdf' | 'txt', now: Date): string {
  return `${sanitizeBaseName(input, now)}.${extension}`;
}
