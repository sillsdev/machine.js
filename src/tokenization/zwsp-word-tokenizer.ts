import { createRange, Range } from '../annotations/range';
import { isPunctuation, isWhitespace } from '../string-utils';
import { LatinWordTokenizer, TokenizeContext } from './latin-word-tokenizer';

export class ZwspWordTokenizer extends LatinWordTokenizer {
  protected processCharacter(
    data: string,
    range: Range,
    ctxt: TokenizeContext
  ): [Range | undefined, Range | undefined] {
    if (isWhitespace(data[ctxt.index])) {
      let endIndex = ctxt.index + 1;
      while (endIndex !== range.end && isWhitespace(data[endIndex])) {
        endIndex++;
      }
      let tokenRanges: [Range | undefined, Range | undefined] = [undefined, undefined];
      if (ctxt.index !== range.end - 1 && (isPunctuation(data[endIndex]) || isWhitespace(data[endIndex]))) {
        if (ctxt.wordStart !== -1) {
          tokenRanges = [createRange(ctxt.wordStart, ctxt.index), undefined];
          ctxt.wordStart = -1;
        }
      } else if (
        ctxt.index !== range.start &&
        (isPunctuation(data[ctxt.index - 1]) || isWhitespace(data[ctxt.index - 1]))
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
