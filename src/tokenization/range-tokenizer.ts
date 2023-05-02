import { Range } from '../annotations/range';
import { Tokenizer } from './tokenizer';

export interface RangeTokenizer<TData = string, TOffset = number, TToken = string>
  extends Tokenizer<TData, TOffset, TToken> {
  tokenizeAsRanges(data: TData, range?: Range<TOffset>): Iterable<Range<TOffset>>;
}
