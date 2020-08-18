import XRegExp from 'xregexp';
import { DetokenizeOperation, StringDetokenizer } from './string-detokenizer';
import { isPunctuation } from './unicode';

enum QuoteType {
  DoubleQuotation,
  SingleQuotation,
  DoubleAngle,
  SingleAngle
}

const QUOTATION_MARKS = new Map<string, QuoteType>([
  ['"', QuoteType.DoubleQuotation],
  ['“', QuoteType.DoubleQuotation],
  ['”', QuoteType.DoubleQuotation],
  ['„', QuoteType.DoubleQuotation],
  ['‟', QuoteType.DoubleQuotation],

  ["'", QuoteType.SingleQuotation],
  ['‘', QuoteType.SingleQuotation],
  ['’', QuoteType.SingleQuotation],
  ['‚', QuoteType.SingleQuotation],
  ['‛', QuoteType.SingleQuotation],

  ['«', QuoteType.DoubleAngle],
  ['»', QuoteType.DoubleAngle],

  ['‹', QuoteType.SingleAngle],
  ['›', QuoteType.SingleAngle]
]);

const MERGE_RIGHT_REGEX: RegExp = XRegExp('^\\p{Sc}|[([{¿¡<]$');

export class LatinWordDetokenizer extends StringDetokenizer {
  protected createContext(): any {
    return [];
  }

  protected getOperation(ctxt: any, token: string): DetokenizeOperation {
    const quotes = ctxt as string[];
    const c = token[0];
    if (MERGE_RIGHT_REGEX.test(c)) {
      return DetokenizeOperation.MergeRight;
    } else if (QUOTATION_MARKS.has(c)) {
      if (quotes.length === 0 || QUOTATION_MARKS.get(c) !== QUOTATION_MARKS.get(quotes[quotes.length - 1])) {
        quotes.push(c);
        return DetokenizeOperation.MergeRight;
      } else {
        quotes.pop();
        return DetokenizeOperation.MergeLeft;
      }
    } else if (c === '/' || c === '\\') {
      return DetokenizeOperation.MergeBoth;
    } else if (isPunctuation(c) || c === '>') {
      return DetokenizeOperation.MergeLeft;
    }
    return DetokenizeOperation.NoOperation;
  }
}
