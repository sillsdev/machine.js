import { TranslationResult } from './translation-result';
import { TranslationSuggestion } from './translation-suggestion';

export interface TranslationSuggester {
  confidenceThreshold: number;
  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: IterableIterator<TranslationResult>
  ): TranslationSuggestion[];
}
