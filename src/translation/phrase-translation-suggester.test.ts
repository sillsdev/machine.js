import { createRange } from '../annotations/range';
import { Phrase } from './phrase';
import { PhraseTranslationSuggester } from './phrase-translation-suggester';
import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';

function createResult(sourceLen: number, prefixLen: number, target: string, confidences: number[]): TranslationResult {
  const targetWords = target.split(' ');
  const targetConfidences = new Array<number>(targetWords.length).fill(0);
  const targetSources = new Array<TranslationSources>(targetWords.length).fill(TranslationSources.None);
  const alignment = new WordAlignmentMatrix(sourceLen, targetWords.length);
  const phrases = new Array<Phrase>(targetWords.length);
  let i = 0;
  let j = 0;
  for (const confidence of confidences) {
    if (j < prefixLen) {
      targetSources[j] = TranslationSources.Prefix;
    }

    if (confidence >= 0) {
      alignment.set(i, j, true);
      targetConfidences[j] = confidence;
      if (confidence > 0) {
        targetSources[j] |= TranslationSources.Smt;
      }
      phrases[j] = new Phrase(createRange(i, i + 1), j + 1, confidence);
      i++;
      j++;
    } else if (targetWords.length > sourceLen) {
      targetConfidences[j] = confidence;
      phrases[j] = new Phrase(createRange(i, i + 1), j + 1, confidence);
      j++;
    } else if (targetWords.length < sourceLen) {
      i++;
    } else {
      throw new Error('A confidence was incorrectly set below 0.');
    }
  }

  return new TranslationResult(
    Array<number>(sourceLen).map((index) => index.toString()),
    targetWords,
    targetConfidences,
    targetSources,
    alignment,
    phrases
  );
}

describe('PhraseTranslationSuggester', () => {
  it('ends at punctuation', () => {
    const result = createResult(5, 0, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]);
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(1, 0, true, [result]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ends at untranslated word', () => {
    const result = createResult(5, 0, 'this is a test .', [0.5, 0.5, 0, 0.5, 0.5]);
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(1, 0, true, [result]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is']);
  });

  it('includes completed word', () => {
    const result = createResult(5, 1, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]);
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(1, 1, false, [result]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('does not include prefix word', () => {
    const result = createResult(5, 1, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]);
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(1, 1, true, [result]);
    expect(suggestions[0].targetWords).toEqual(['is', 'a', 'test']);
  });

  it('does not include prefix, partial word', () => {
    const result = createResult(5, 1, 'te this is a test .', [-1, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(1, 1, false, [result]);
    expect(suggestions.length).toEqual(0);
  });

  it('multiple suggestions', () => {
    const results = [
      createResult(5, 0, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
      createResult(5, 0, 'that is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
      createResult(5, 0, 'other is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
    ];
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(2);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
    expect(suggestions[1].targetWords).toEqual(['that', 'is', 'a', 'test']);
  });

  it('ignores duplicate suggestion', () => {
    const results = [
      createResult(6, 0, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
      createResult(6, 0, 'is a test . second sentence', [0.5, 0.5, 0.5, 0.5, 0.1, 0.1]),
    ];
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ignores good suggestion that starts with punctuation', () => {
    const results = [
      createResult(6, 0, ', this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]),
      createResult(6, 0, 'this is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
    ];
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ignores all suggestions after a bad suggestion', () => {
    const results = [
      createResult(5, 0, 'this is a test .', [0.1, 0.5, 0.5, 0.5, 0.5]),
      createResult(5, 0, 'that is a test .', [0.5, 0.5, 0.5, 0.5, 0.5]),
    ];
    const suggester = new PhraseTranslationSuggester();
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(0);
  });
});
