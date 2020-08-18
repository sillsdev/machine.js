import { LatinWordDetokenizer } from './latin-word-detokenizer';
import { DetokenizeOperation } from './string-detokenizer';
import { isPunctuation, isWhitespace } from './unicode';

export class ZwspWordDetokenizer extends LatinWordDetokenizer {
  protected getOperation(ctxt: any, token: string): DetokenizeOperation {
    if (isWhitespace(token[0])) {
      return DetokenizeOperation.MergeBoth;
    }
    return super.getOperation(ctxt, token);
  }

  protected getSeparator(tokens: string[], ops: DetokenizeOperation[], index: number): string {
    if (
      index < tokens.length - 1 &&
      ops[index + 1] === DetokenizeOperation.MergeRight &&
      isPunctuation(tokens[index + 1][0])
    ) {
      return ' ';
    } else if (ops[index] === DetokenizeOperation.MergeLeft && isPunctuation(tokens[index][0])) {
      return ' ';
    }
    return '\u200b';
  }
}
