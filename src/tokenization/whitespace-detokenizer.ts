import { DetokenizeOperation, StringDetokenizer } from './string-detokenizer';

export class WhitespaceDetokenizer extends StringDetokenizer {
  protected getOperation(_ctxt: unknown, _token: string): DetokenizeOperation {
    return DetokenizeOperation.NoOperation;
  }
}
