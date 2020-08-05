import { Detokenizer } from './detokenizer';

export enum DetokenizeOperation {
  NoOperation,
  MergeLeft,
  MergeRight,
  MergeBoth
}

export abstract class StringDetokenizer implements Detokenizer {
  detokenize(tokens: string[]): string {
    const ctxt = this.createContext();
    const ops = tokens.map(t => this.getOperation(ctxt, t));
    let output = '';
    for (let i = 0; i < tokens.length; i++) {
      output += tokens[i];

      let isAppendSpace = true;
      if (i + 1 === ops.length) {
        isAppendSpace = false;
      } else if (ops[i + 1] === DetokenizeOperation.MergeLeft || ops[i + 1] === DetokenizeOperation.MergeBoth) {
        isAppendSpace = false;
      } else if (ops[i] === DetokenizeOperation.MergeRight || ops[i] === DetokenizeOperation.MergeBoth) {
        isAppendSpace = false;
      }

      if (isAppendSpace) {
        output += ' ';
      }
    }
    return output;
  }

  protected createContext(): any {
    return undefined;
  }

  protected abstract getOperation(ctxt: any, token: string): DetokenizeOperation;
}
