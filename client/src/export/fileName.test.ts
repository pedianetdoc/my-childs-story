import { defaultBaseName, exportFileName, sanitizeBaseName } from './fileName';

const NOW = new Date(2026, 10, 22, 10, 0); // local 2026-11-22

describe('AC-14: export file names', () => {
  it('AC-14: defaults to story-YYYY-MM-DD with the right extension', () => {
    expect(defaultBaseName(NOW)).toBe('story-2026-11-22');
    expect(exportFileName('', 'docx', NOW)).toBe('story-2026-11-22.docx');
    expect(exportFileName('', 'pdf', NOW)).toBe('story-2026-11-22.pdf');
  });

  it('AC-14: sanitizes a name containing / or :', () => {
    expect(sanitizeBaseName('visit: 2026/notes', NOW)).toBe('notes');
    expect(sanitizeBaseName('visit: Monday', NOW)).toBe('visit- Monday');
    expect(exportFileName('a/b:c', 'pdf', NOW)).toBe('b-c.pdf');
  });

  it.each([
    ['../../etc/passwd', 'passwd'],
    ['C:\\Users\\me\\story', 'story'],
    ['my*story?<>|"', 'my-story-----'],
    ['  spaced   name  ', 'spaced name'],
    ['story.pdf', 'story'],
    ['...hidden', 'hidden'],
    ['CON', 'story-CON'],
    ['Kuwento ni Niño', 'Kuwento ni Niño'],
    ['tab\there', 'tab-here'],
  ])('strips paths and illegal characters: %j → %j', (input, expected) => {
    expect(sanitizeBaseName(input, NOW)).toBe(expected);
  });

  it.each(['', '   ', '/', '..', ':::'.replace(/:/g, '/')])(
    'falls back to the default when nothing usable is left: %j',
    (input) => {
      expect(sanitizeBaseName(input, NOW)).toBe('story-2026-11-22');
    },
  );

  it('limits the length', () => {
    expect(Array.from(sanitizeBaseName('ñ'.repeat(300), NOW))).toHaveLength(100);
  });
});
