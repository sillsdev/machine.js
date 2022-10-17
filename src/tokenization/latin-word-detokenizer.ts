import XRegExp from 'xregexp';
import { isPunctuation } from '../string-utils';
import { DetokenizeOperation, StringDetokenizer } from './string-detokenizer';

enum QuoteType {
  DoubleQuotation,
  SingleQuotation,
  DoubleAngle,
  SingleAngle,
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
  ['›', QuoteType.SingleAngle],
]);

const MERGE_RIGHT_REGEX: RegExp = XRegExp('^\\p{Sc}|[([{¿¡<]$');

export class LatinWordDetokenizer extends StringDetokenizer {
  protected createContext(): string[] {
    return [];
  }

  protected getOperation(ctxt: string[], token: string): DetokenizeOperation {
    const c = token[0];
    if (MERGE_RIGHT_REGEX.test(c)) {
      return DetokenizeOperation.MergeRight;
    } else if (QUOTATION_MARKS.has(c)) {
      if (ctxt.length === 0 || QUOTATION_MARKS.get(c) !== QUOTATION_MARKS.get(ctxt[ctxt.length - 1])) {
        ctxt.push(c);
        return DetokenizeOperation.MergeRight;
      } else {
        ctxt.pop();
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
