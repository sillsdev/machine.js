import { createRange, Range } from '../annotations/range';
import { isWhitespace } from '../string-utils';
import { StringTokenizer } from './string-tokenizer';

export class WhitespaceTokenizer extends StringTokenizer {
  *tokenizeAsRanges(data: string, range: Range = createRange(0, data.length)): Iterable<Range> {
    let startIndex = -1;
    for (let i = range.start; i < range.end; i++) {
      if (this.isWhitespace(data[i])) {
        if (startIndex !== -1) {
          yield createRange(startIndex, i);
        }
        startIndex = -1;
      } else if (startIndex === -1) {
        startIndex = i;
      }
    }

    if (startIndex !== -1) {
      yield createRange(startIndex, range.end);
    }
  }

  protected isWhitespace(c: string): boolean {
    return isWhitespace(c) || c === '\u200b' || c === '\ufeff';
  }
}

export const WHITESPACE_TOKENIZER = new WhitespaceTokenizer();
