/**
 * Leading connectors that minimal cleaning may remove — spec.md rule 4.6.2.
 *
 * `text` may differ from its `sourceQuote` by at most ONE of these words, and
 * only at the very start. Compared after lowercasing and removing punctuation.
 * This is a fixed list; changing it changes the spec.
 */
export const LEADING_CONNECTORS: readonly string[] = [
  'and',
  'then',
  'also',
  'so',
  'tapos',
  'at',
  'saka',
];

const CONNECTOR_SET: ReadonlySet<string> = new Set(LEADING_CONNECTORS);

export function isLeadingConnector(word: string): boolean {
  return CONNECTOR_SET.has(word);
}
