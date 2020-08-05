export interface Detokenizer<TData = string, TToken = string> {
  detokenize(tokens: TToken[]): TData;
}
