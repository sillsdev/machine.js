import { createRange, Range } from '../annotations/range';
import { isControl, isPunctuation, isSymbol } from '../string-utils';
import { WhitespaceTokenizer } from './whitespace-tokenizer';

const INNER_WORD_PUNCT_REGEX = /^[&\-.:=,?@\xAD\xB7\u2010\u2011\u2019\u2027]|['_]+/u;
const URL_REGEX = /^(?:[\w-]+:\/\/?|www[.])[^\s()<>]+(?:[\w\d]+|(?:[^\p{P}\s]|\/))/iu;

export class TokenizeContext {
  index = 0;
  wordStart = -1;
  innerWordPunct = -1;
}

export class LatinWordTokenizer extends WhitespaceTokenizer {
  treatApostropheAsSingleQuote = false;

  private readonly abbreviations: Set<string>;

  constructor(abbreviations: string[] = []) {
    super();
    this.abbreviations = new Set<string>(abbreviations.map((a) => a.toLowerCase()));
  }

  *tokenizeAsRanges(data: string, range: Range = createRange(0, data.length)): Iterable<Range> {
    const ctxt = new TokenizeContext();
    for (const charRange of super.tokenizeAsRanges(data, range)) {
      const urlMatch = URL_REGEX.exec(data.substring(charRange.start, charRange.end));
      if (urlMatch != null) {
        yield createRange(charRange.start, charRange.start + urlMatch[0].length);
        ctxt.index = charRange.start + urlMatch[0].length;
      } else {
        ctxt.index = charRange.start;
      }
      ctxt.wordStart = -1;
      ctxt.innerWordPunct = -1;
      while (ctxt.index < charRange.end) {
        const [tokenRange1, tokenRange2] = this.processCharacter(data, range, ctxt);
        if (tokenRange1 != null) {
          yield tokenRange1;
        }
        if (tokenRange2 != null) {
          yield tokenRange2;
        }
      }

      if (ctxt.wordStart !== -1) {
        if (ctxt.innerWordPunct !== -1) {
          const innerPunctStr = data.substring(ctxt.innerWordPunct, charRange.end);
          if (
            (innerPunctStr === '.' && this.isAbbreviation(data, ctxt.wordStart, ctxt.innerWordPunct)) ||
            (innerPunctStr === "'" && !this.treatApostropheAsSingleQuote)
          ) {
            yield createRange(ctxt.wordStart, charRange.end);
          } else {
            yield createRange(ctxt.wordStart, ctxt.innerWordPunct);
            yield createRange(ctxt.innerWordPunct, charRange.end);
          }
        } else {
          yield createRange(ctxt.wordStart, charRange.end);
        }
      }
    }
  }

  protected processCharacter(
    data: string,
    range: Range,
    ctxt: TokenizeContext
  ): [Range | undefined, Range | undefined] {
    let tokenRanges: [Range | undefined, Range | undefined] = [undefined, undefined];
    const c = data[ctxt.index];
    let endIndex = ctxt.index + 1;
    if (isPunctuation(c) || isSymbol(c) || isControl(c)) {
      while (endIndex !== range.end && data[endIndex] === c) {
        endIndex++;
      }
      if (ctxt.wordStart === -1) {
        if (c === "'" && !this.treatApostropheAsSingleQuote) {
          ctxt.wordStart = ctxt.index;
        } else {
          tokenRanges = [createRange(ctxt.index, endIndex), undefined];
        }
      } else if (ctxt.innerWordPunct !== -1) {
        const innerPunctStr = data.substring(ctxt.innerWordPunct, ctxt.index);
        if (innerPunctStr === "'" && !this.treatApostropheAsSingleQuote) {
          tokenRanges = [createRange(ctxt.wordStart, ctxt.index), undefined];
        } else {
          tokenRanges = [
            createRange(ctxt.wordStart, ctxt.innerWordPunct),
            createRange(ctxt.innerWordPunct, ctxt.index),
          ];
        }
        ctxt.wordStart = ctxt.index;
      } else {
        const match = this.nextInnerWordPunct(data, ctxt.index);
        if (match !== '') {
          ctxt.innerWordPunct = ctxt.index;
          ctxt.index += match.length;
          return tokenRanges;
        }

        tokenRanges = [createRange(ctxt.wordStart, ctxt.index), createRange(ctxt.index, endIndex)];
        ctxt.wordStart = -1;
      }
    } else if (ctxt.wordStart === -1) {
      ctxt.wordStart = ctxt.index;
    }

    ctxt.innerWordPunct = -1;
    ctxt.index = endIndex;
    return tokenRanges;
  }

  private nextInnerWordPunct(char: string, index: number): string {
    const result = INNER_WORD_PUNCT_REGEX.exec(char.substring(index));
    if (result == null) {
      return '';
    }

    return result[0];
  }

  private isAbbreviation(data: string, start: number, end: number): boolean {
    return this.abbreviations.has(data.substring(start, end).toLowerCase());
  }
}
