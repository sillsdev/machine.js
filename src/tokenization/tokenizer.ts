import { Range } from '../annotations/range';

export interface Tokenizer<TData = string, TOffset = number, TToken = string> {
  tokenize(data: TData, range?: Range<TOffset>): Iterable<TToken>;
}
