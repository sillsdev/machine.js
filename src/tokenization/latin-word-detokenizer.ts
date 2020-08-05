import XRegExp from 'xregexp';
import { DetokenizeOperation, StringDetokenizer } from './string-detokenizer';

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
const MERGE_LEFT_REGEX: RegExp = XRegExp('^\\p{P}|>$');

export class LatinWordDetokenizer extends StringDetokenizer {
  protected createContext(): any {
    return [];
  }

  protected getOperation(ctxt: any, token: string): DetokenizeOperation {
    const quotes = ctxt as string[];
    if (token.length === 1) {
      if (MERGE_RIGHT_REGEX.test(token)) {
        return DetokenizeOperation.MergeRight;
      } else if (QUOTATION_MARKS.has(token)) {
        if (quotes.length === 0 || QUOTATION_MARKS.get(token) !== QUOTATION_MARKS.get(quotes[quotes.length - 1])) {
          quotes.push(token);
          return DetokenizeOperation.MergeRight;
        } else {
          quotes.pop();
          return DetokenizeOperation.MergeLeft;
        }
      } else if (token === '/' || token === '\\') {
        return DetokenizeOperation.MergeBoth;
      } else if (MERGE_LEFT_REGEX.test(token)) {
        return DetokenizeOperation.MergeLeft;
      }
    }
    return DetokenizeOperation.NoOperation;
  }
}
