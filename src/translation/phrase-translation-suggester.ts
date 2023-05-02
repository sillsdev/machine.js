import XRegExp from 'xregexp';

import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { TranslationSuggester } from './translation-suggester';
import { TranslationSuggestion } from './translation-suggestion';

const ALL_PUNCT_REGEXP = XRegExp('^\\p{P}*$');

export class PhraseTranslationSuggester implements TranslationSuggester {
  constructor(public confidenceThreshold = 0, public breakOnPunctuation = true) {}

  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: Iterable<TranslationResult>
  ): TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
    const suggestionStrs: string[] = [];
    for (const result of results) {
      let startingJ = prefixCount;
      if (!isLastWordComplete) {
        // if the prefix ends with a partial word and it has been completed,
        // then make sure it is included as a suggestion,
        // otherwise, don't return any suggestions
        if ((result.sources[startingJ - 1] & TranslationSources.Smt) !== 0) {
          startingJ--;
        } else {
          break;
        }
      }

      let k = 0;
      while (k < result.phrases.length && result.phrases[k].targetSegmentCut <= startingJ) {
        k++;
      }

      let suggestionConfidence = -1;
      const indices: number[] = [];
      let endingJ = startingJ;
      for (; k < result.phrases.length; k++) {
        const phrase = result.phrases[k];
        let phraseConfidence = 1;
        for (let j = startingJ; j < phrase.targetSegmentCut; j++) {
          if (result.sources[j] === TranslationSources.None) {
            // hit an unknown word, so don't include any more words in this suggestion
            phraseConfidence = 0;
            break;
          }
          const word = result.targetTokens[j];
          if (this.breakOnPunctuation && ALL_PUNCT_REGEXP.test(word)) {
            break;
          }

          phraseConfidence = Math.min(phraseConfidence, result.confidences[j]);
          if (phraseConfidence < this.confidenceThreshold) {
            break;
          }

          endingJ = j + 1;
        }

        if (phraseConfidence >= this.confidenceThreshold) {
          suggestionConfidence =
            suggestionConfidence == -1 ? phraseConfidence : Math.min(suggestionConfidence, phraseConfidence);

          if (startingJ === endingJ) break;

          for (let j = startingJ; j < endingJ; j++) {
            indices.push(j);
          }

          startingJ = phrase.targetSegmentCut;
        } else {
          // hit a phrase with a low confidence, so don't include any more words in this suggestion
          break;
        }
      }
      if (suggestionConfidence === -1) {
        // the suggestion started with a low confidence phrase, so probably all suggestions after this one are bad
        break;
      } else if (indices.length === 0) {
        // this suggestion starts with a punctuation, so keep looking for more suggestions
        continue;
      }

      const newSuggestion = new TranslationSuggestion(
        result,
        indices,
        suggestionConfidence < 0 ? 0 : suggestionConfidence
      );
      // make sure this suggestion isn't a duplicate of a better suggestion
      const newSuggestionStr = newSuggestion.targetWords.join('\u0001');
      let isDuplicate = false;
      for (const suggestionStr of suggestionStrs) {
        if (suggestionStr.length >= newSuggestionStr.length && suggestionStr.includes(newSuggestionStr)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        suggestionStrs.push(newSuggestionStr);
        suggestions.push(newSuggestion);
        if (suggestions.length === n) {
          break;
        }
      }
    }

    return suggestions;
  }
}
