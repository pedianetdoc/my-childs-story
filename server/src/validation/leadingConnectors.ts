/**
 * Leading connectors that minimal cleaning may remove — spec.md rule 4.6.2.
 *
 * `text` may differ from its `sourceQuote` by at most ONE of these words, and
 * only at the very start. Compared after lowercasing and removing punctuation.
 * This is a fixed, clinician-decided list; changing it changes the spec and the
 * prompt (server/prompts/history-organizer.v1.md), which must name the same words.
 * "at" is deliberately excluded: it is also an English preposition ("At home…").
 */
export const LEADING_CONNECTORS: readonly string[] = [
  'and',
  'then',
  'also',
  'so',
  'tapos',
  'saka',
];

const CONNECTOR_SET: ReadonlySet<string> = new Set(LEADING_CONNECTORS);

export function isLeadingConnector(word: string): boolean {
  return CONNECTOR_SET.has(word);
}
