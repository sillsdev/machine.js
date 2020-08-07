import XRegExp from 'xregexp';

import { createRange, Range } from '../annotations/range';
import { LatinWordTokenizer, TokenizeContext } from './latin-word-tokenizer';

const WHITESPACE_REGEX: RegExp = XRegExp('^\\p{Z}$');
const PUNCT_REGEX: RegExp = XRegExp('^\\p{P}$');

export class ZwspWordTokenizer extends LatinWordTokenizer {
  protected processCharacter(
    data: string,
    range: Range,
    ctxt: TokenizeContext
  ): [Range | undefined, Range | undefined] {
    if (WHITESPACE_REGEX.test(data[ctxt.index])) {
      let endIndex = ctxt.index + 1;
      while (endIndex !== range.end && WHITESPACE_REGEX.test(data[endIndex])) {
        endIndex++;
      }
      let tokenRanges: [Range | undefined, Range | undefined] = [undefined, undefined];
      if (ctxt.index !== range.end - 1 && (PUNCT_REGEX.test(data[endIndex]) || WHITESPACE_REGEX.test(data[endIndex]))) {
        if (ctxt.wordStart !== -1) {
          tokenRanges = [createRange(ctxt.wordStart, ctxt.index), undefined];
          ctxt.wordStart = -1;
        }
      } else if (
        ctxt.index !== range.start &&
        (PUNCT_REGEX.test(data[ctxt.index - 1]) || WHITESPACE_REGEX.test(data[ctxt.index - 1]))
      ) {
        if (ctxt.innerWordPunct !== -1) {
          tokenRanges = [createRange(ctxt.wordStart, ctxt.innerWordPunct), createRange(ctxt.innerWordPunct)];
          ctxt.wordStart = -1;
        }
      } else if (ctxt.wordStart === -1) {
        tokenRanges = [createRange(ctxt.index, endIndex), undefined];
      } else if (ctxt.innerWordPunct !== -1) {
        tokenRanges = [createRange(ctxt.wordStart, ctxt.innerWordPunct), createRange(ctxt.innerWordPunct, ctxt.index)];
        ctxt.wordStart = ctxt.index;
      } else {
        tokenRanges = [createRange(ctxt.wordStart, ctxt.index), createRange(ctxt.index, endIndex)];
        ctxt.wordStart = -1;
      }
      ctxt.innerWordPunct = -1;
      ctxt.index = endIndex;
      return tokenRanges;
    }
    return super.processCharacter(data, range, ctxt);
  }

  protected isWhitespace(c: string): boolean {
    return c === '\u200b' || c === '\ufeff';
  }
}
