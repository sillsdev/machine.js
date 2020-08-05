import { DetokenizeOperation, StringDetokenizer } from './string-detokenizer';

export class WhitespaceDetokenizer extends StringDetokenizer {
  protected getOperation(_ctxt: any, _token: string): DetokenizeOperation {
    return DetokenizeOperation.NoOperation;
  }
}
