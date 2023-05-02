export interface Detokenizer<TData = string, TToken = string> {
  detokenize(tokens: Iterable<TToken>): TData;
}
