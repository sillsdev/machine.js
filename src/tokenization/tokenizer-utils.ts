import { createRange, Range } from '../annotations/range';
import { map } from '../iterable-utils';

export function split(str: string, ranges: Iterable<Range>): string[] {
  return Array.from(map(ranges, (r) => str.substring(r.start, r.end)));
}

export function* getRanges(str: string, tokens: Iterable<string>): IterableIterator<Range> {
  let start = 0;

  for (const token of tokens) {
    const index = str.indexOf(token, start);
    if (index === -1) throw new Error(`The string does not contain the specified token: ${token}.`);
    yield createRange(index, index + token.length);
    start = index + token.length;
  }
}
