import { createRange, Range } from '../annotations/range';
import { RangeTokenizer } from './range-tokenizer';

export abstract class StringTokenizer implements RangeTokenizer {
  tokenize(data: string, range: Range = createRange(0, data.length)): string[] {
    return this.tokenizeAsRanges(data, range).map(r => data.substring(r.start, r.end));
  }

  abstract tokenizeAsRanges(data: string, range?: Range): Range[];
}
