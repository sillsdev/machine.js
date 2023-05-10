import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { TranslationSuggester } from './translation-suggester';
import { TranslationSuggestion } from './translation-suggestion';

const ALL_PUNCT_REGEXP = /^\p{P}*$/u;

function computeKmpTable(newSuggestion: readonly string[]): number[] {
  const table = new Array<number>(newSuggestion.length);
  let len = 0;
  let i = 1;
  table[0] = 0;

  while (i < newSuggestion.length) {
    if (newSuggestion[i] === newSuggestion[len]) {
      len++;
      table[i] = len;
      i++;
    } else if (len !== 0) {
      len = table[len - 1];
    } else {
      table[i] = len;
      i++;
    }
  }
  return table;
}

function isSubsequence(
  table: readonly number[],
  newSuggestion: readonly string[],
  suggestion: readonly string[]
): boolean {
  let j = 0;
  let i = 0;
  while (i < suggestion.length) {
    if (newSuggestion[j] === suggestion[i]) {
      j++;
      i++;
    }
    if (j === newSuggestion.length) {
      return true;
    } else if (i < suggestion.length && newSuggestion[j] !== suggestion[i]) {
      if (j !== 0) {
        j = table[j - 1];
      } else {
        i++;
      }
    }
  }
  return false;
}

export class PhraseTranslationSuggester implements TranslationSuggester {
  constructor(public confidenceThreshold = 0, public breakOnPunctuation = true) {}

  getSuggestions(
    n: number,
    prefixCount: number,
    isLastWordComplete: boolean,
    results: Iterable<TranslationResult>
  ): readonly TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
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
      for (; k < result.phrases.length; k++) {
        const phrase = result.phrases[k];
        let phraseConfidence = 1;
        let endingJ = startingJ;
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

          if (startingJ === endingJ) {
            break;
          }

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

      const newSuggestion = new TranslationSuggestion(result, indices, suggestionConfidence);
      // make sure this suggestion isn't a duplicate of a better suggestion
      let isDuplicate = false;
      let newSuggestionsWords: string[] | undefined;
      let table: number[] | undefined;
      for (const suggestion of suggestions) {
        if (suggestion.targetWordIndices.length >= newSuggestion.targetWordIndices.length) {
          if (newSuggestionsWords == null) {
            newSuggestionsWords = newSuggestion.targetWords;
          }
          if (table == null) {
            table = computeKmpTable(newSuggestionsWords);
          }
          if (isSubsequence(table, newSuggestionsWords, suggestion.targetWords)) {
            isDuplicate = true;
            break;
          }
        }
      }
      if (!isDuplicate) {
        suggestions.push(newSuggestion);
        if (suggestions.length === n) {
          break;
        }
      }
    }

    return suggestions;
  }
}
