const ENCODINGS = new Map<number, string>([
  [1200, 'utf16le'],
  [20127, 'ascii'],
  [28591, 'latin1'],
  [65001, 'utf8'],
]);

export function getEncoding(codePage: number): string | undefined {
  return ENCODINGS.get(codePage);
}
