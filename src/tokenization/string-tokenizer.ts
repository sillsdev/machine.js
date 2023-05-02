import { createRange, Range } from '../annotations/range';
import { RangeTokenizer } from './range-tokenizer';
import { genSequence } from 'gensequence';

export abstract class StringTokenizer implements RangeTokenizer {
  tokenize(data: string, range: Range = createRange(0, data.length)): Iterable<string> {
    return genSequence(this.tokenizeAsRanges(data, range)).map((r) => data.substring(r.start, r.end));
  }

  abstract tokenizeAsRanges(data: string, range?: Range): Iterable<Range>;
}
