import XRegExp from 'xregexp';
import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { TranslationSuggester } from './translation-suggester';
import { TranslationSuggestion } from './translation-suggestion';

const ALL_PUNCT_REGEXP = XRegExp('^\\p{P}*$');

export class PhraseTranslationSuggester implements TranslationSuggester {
  confidenceThreshold: number = 0;
  breakOnPunctuation: boolean = true;

  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: IterableIterator<TranslationResult>
  ): TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
    const suggestionStrs: string[] = [];
    for (const result of results) {
      let startingJ = prefixCount;
      if (!isLastWordComplete) {
        // if the prefix ends with a partial word and it has been completed,
        // then make sure it is included as a suggestion,
        // otherwise, don't return any suggestions
        if ((result.wordSources[startingJ - 1] & TranslationSources.Smt) !== 0) {
          startingJ--;
        } else {
          break;
        }
      }

      let k = 0;
      while (k < result.phrases.length && result.phrases[k].targetSegmentCut <= startingJ) {
        k++;
      }

      let minConfidence = -1;
      const indices: number[] = [];
      let newSuggestionStr: string = '';
      let hitPunctuation = false;
      for (; k < result.phrases.length; k++) {
        const phrase = result.phrases[k];
        let isUnknown = false;
        if (phrase.confidence >= this.confidenceThreshold) {
          for (let j = startingJ; j < phrase.targetSegmentCut; j++) {
            if (result.wordSources[j] === TranslationSources.None) {
              isUnknown = true;
              break;
            }
            const word = result.targetSegment[j];
            if (ALL_PUNCT_REGEXP.test(word)) {
              hitPunctuation = true;
            }
            if (!this.breakOnPunctuation || !hitPunctuation) {
              indices.push(j);
              const wordConfidence = result.wordConfidences[j];
              if (minConfidence < 0 || wordConfidence < minConfidence) {
                minConfidence = wordConfidence;
              }
            }
            if (newSuggestionStr.length > 0) {
              newSuggestionStr += '\u0001';
            }
            newSuggestionStr += word;
          }
          if (isUnknown) {
            break;
          }

          startingJ = phrase.targetSegmentCut;
        } else {
          break;
        }
      }

      if (indices.length === 0) {
        if (newSuggestionStr.length > 0) {
          continue;
        } else {
          // the suggestion is empty, so probably all suggestions after this one are bad
          break;
        }
      }

      let isDuplicate = false;
      for (const suggestionStr of suggestionStrs) {
        if (suggestionStr.length >= newSuggestionStr.length && suggestionStr.includes(newSuggestionStr)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        suggestionStrs.push(newSuggestionStr);
        suggestions.push(new TranslationSuggestion(result, indices, minConfidence < 0 ? 0 : minConfidence));
        if (suggestions.length === n) {
          break;
        }
      }
    }

    return suggestions;
  }
}
