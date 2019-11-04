import { GeneralizedSuffixArray } from 'mnemonist/suffix-array';
import XRegExp from 'xregexp';
import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { TranslationSuggester } from './translation-suggester';
import { TranslationSuggestion } from './translation-suggestion';

const ALL_PUNCT_REGEXP = XRegExp('^\\p{P}*$');

export class PhraseTranslationSuggester implements TranslationSuggester {
  confidenceThreshold: number = 0;

  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: IterableIterator<TranslationResult>
  ): TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
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
      const words: string[] = [];
      for (; k < result.phrases.length; k++) {
        const phrase = result.phrases[k];
        if (phrase.confidence >= this.confidenceThreshold) {
          let hitBreakingWord = false;
          for (let j = startingJ; j < phrase.targetSegmentCut; j++) {
            const word = result.targetSegment[j];
            const sources = result.wordSources[j];
            if (sources === TranslationSources.None || ALL_PUNCT_REGEXP.test(word)) {
              hitBreakingWord = true;
              break;
            }
            indices.push(j);
            words.push(word);
          }
          if (minConfidence < 0 || phrase.confidence < minConfidence) {
            minConfidence = phrase.confidence;
          }
          startingJ = phrase.targetSegmentCut;
          if (hitBreakingWord) {
            break;
          }
        } else {
          break;
        }
      }

      if (indices.length === 0) {
        break;
      }
      let isDuplicate = false;
      for (const suggestion of suggestions) {
        const suffixArray = new GeneralizedSuffixArray([suggestion.targetWords, words]);
        const lcs = suffixArray.longestCommonSubsequence();
        if (lcs.length === words.length) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) {
        continue;
      }
      suggestions.push(new TranslationSuggestion(result, indices, minConfidence < 0 ? 0 : minConfidence));
      if (suggestions.length === n) {
        break;
      }
    }
    return suggestions;
  }
}
