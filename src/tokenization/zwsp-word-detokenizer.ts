import XRegExp from 'xregexp';

import { LatinWordDetokenizer } from './latin-word-detokenizer';
import { DetokenizeOperation } from './string-detokenizer';

const WHITESPACE_REGEX: RegExp = XRegExp('^\\p{Z}$');
const PUNCT_REGEX: RegExp = XRegExp('^\\p{P}$');

export class ZwspWordDetokenizer extends LatinWordDetokenizer {
  protected getOperation(ctxt: any, token: string): DetokenizeOperation {
    if (WHITESPACE_REGEX.test(token[0])) {
      return DetokenizeOperation.MergeBoth;
    }
    return super.getOperation(ctxt, token);
  }

  protected getSeparator(tokens: string[], ops: DetokenizeOperation[], index: number): string {
    if (
      index < tokens.length - 1 &&
      ops[index + 1] === DetokenizeOperation.MergeRight &&
      PUNCT_REGEX.test(tokens[index + 1][0])
    ) {
      return ' ';
    } else if (ops[index] === DetokenizeOperation.MergeLeft && PUNCT_REGEX.test(tokens[index][0])) {
      return ' ';
    }
    return '\u200b';
  }
}
