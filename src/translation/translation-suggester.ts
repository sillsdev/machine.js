import { TranslationResult } from './translation-result';
import { TranslationSuggestion } from './translation-suggestion';

export interface TranslationSuggester {
  confidenceThreshold: number;
  breakOnPunctuation: boolean;

  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: IterableIterator<TranslationResult>
  ): TranslationSuggestion[];
}
