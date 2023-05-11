import { createRange, Range } from '../annotations/range';
import { map } from '../iterable-utils';
import { RangeTokenizer } from './range-tokenizer';

export abstract class StringTokenizer implements RangeTokenizer {
  tokenize(data: string, range: Range = createRange(0, data.length)): Iterable<string> {
    return map(this.tokenizeAsRanges(data, range), (r) => data.substring(r.start, r.end));
  }

  abstract tokenizeAsRanges(data: string, range?: Range): Iterable<Range>;
}
