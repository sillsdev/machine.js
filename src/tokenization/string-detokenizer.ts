import { Detokenizer } from './detokenizer';

export enum DetokenizeOperation {
  NoOperation,
  MergeLeft,
  MergeRight,
  MergeBoth,
}

export abstract class StringDetokenizer implements Detokenizer {
  detokenize(tokens: string[]): string {
    const ctxt = this.createContext();
    const ops = tokens.map((t) => this.getOperation(ctxt, t));
    let output = '';
    for (let i = 0; i < tokens.length; i++) {
      output += this.transformToken(tokens[i]);

      let appendSeparator = true;
      if (i + 1 === ops.length) {
        appendSeparator = false;
      } else if (ops[i + 1] === DetokenizeOperation.MergeLeft || ops[i + 1] === DetokenizeOperation.MergeBoth) {
        appendSeparator = false;
      } else if (ops[i] === DetokenizeOperation.MergeRight || ops[i] === DetokenizeOperation.MergeBoth) {
        appendSeparator = false;
      }

      if (appendSeparator) {
        output += this.getSeparator(tokens, ops, i);
      }
    }
    return output;
  }

  protected createContext(): unknown {
    return undefined;
  }

  protected abstract getOperation(ctxt: unknown, token: string): DetokenizeOperation;

  protected getSeparator(_tokens: string[], _ops: DetokenizeOperation[], _index: number): string {
    return ' ';
  }

  protected transformToken(token: string): string {
    return token;
  }
}
