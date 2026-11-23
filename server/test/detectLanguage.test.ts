import { describe, expect, it } from 'vitest';
import {
  FILIPINO_SHARE_THRESHOLD,
  LANGUAGE_INSTRUCTIONS,
  detectLanguage,
  filipinoShare,
} from '../src/historyOrganizer/index.js';

// FICTIONAL samples only.
const ENGLISH =
  'My main worry is that he says only a few words. He loves stacking blocks and can do it for a long time. ' +
  'He was born at 36 weeks and had ear infections last year.';

const ENGLISH_WITH_FILIPINO_NAMES =
  'My main worry is that he says only a few words. His Lola Remedios says he was the same as his cousin ' +
  'Paolo at that age. He loves stacking blocks with Tito Ben. We visit Lolo in Batangas every summer.';

const FILIPINO =
  'Ang anak ko ay tatlong taon na. Hindi pa siya masyadong nagsasalita. Mahilig siya sa mga laruan na ' +
  'sasakyan at ayaw niya ng maingay na lugar.';

const TAGLISH =
  'Nag-aalala ako kasi 2 and a half years old na siya pero konti pa lang ang words niya. He says "mama" ' +
  'and "ball". Minsan tinuturo niya yung gusto niya, pero madalas umiiyak na lang siya. He loves puzzles.';

describe('detectLanguage (spec 4.5): decided in code, not by the model', () => {
  it('returns en for an English story', () => {
    expect(detectLanguage(ENGLISH)).toBe('en');
  });

  it('keeps en for an English story that mentions Filipino names or "Lola"', () => {
    expect(filipinoShare(ENGLISH_WITH_FILIPINO_NAMES)).toBe(0);
    expect(detectLanguage(ENGLISH_WITH_FILIPINO_NAMES)).toBe('en');
    expect(detectLanguage('Lola says he loves trains and he naps after lunch every day.')).toBe('en');
  });

  it('returns fil for a Filipino story', () => {
    expect(detectLanguage(FILIPINO)).toBe('fil');
  });

  it('returns fil for Taglish', () => {
    expect(filipinoShare(TAGLISH)).toBeGreaterThanOrEqual(FILIPINO_SHARE_THRESHOLD);
    expect(detectLanguage(TAGLISH)).toBe('fil');
  });

  it('keeps en when only a stray connector is Filipino', () => {
    const mostlyEnglish =
      'My son is 3 years old. He loves trains and dinosaurs. Sometimes he gets upset when we leave the ' +
      'playground, tapos he cries for a long time. His teacher says he is doing well in class.';
    expect(detectLanguage(mostlyEnglish)).toBe('en');
  });

  it('uses the 15% threshold exactly (at least 15% → fil)', () => {
    // 3 Filipino function words out of 20 words = 15%.
    const at = `ang ng sa ${'word '.repeat(17)}`;
    expect(filipinoShare(at)).toBeCloseTo(0.15);
    expect(detectLanguage(at)).toBe('fil');
    // 2 out of 20 = 10%.
    const below = `ang ng ${'word '.repeat(18)}`;
    expect(detectLanguage(below)).toBe('en');
  });

  it('matches whole words only, case-insensitively, keeping hyphenated words whole', () => {
    expect(filipinoShare('Banana sang along')).toBe(0); // "sa", "ang" inside words do not count
    expect(filipinoShare('ANG Sa')).toBe(1);
    expect(filipinoShare('nag-aalala')).toBe(0);
  });

  it('is deterministic and handles text with no words', () => {
    expect(detectLanguage(TAGLISH)).toBe(detectLanguage(TAGLISH));
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('12 34 !!')).toBe('en');
  });

  it('has an explicit instruction for each language', () => {
    expect(LANGUAGE_INSTRUCTIONS.en).toBe('Write every question and reason in English.');
    expect(LANGUAGE_INSTRUCTIONS.fil).toBe(
      "Write every question and reason in Filipino, matching the parent's mix of Filipino and English, using polite 'po'.",
    );
  });
});
