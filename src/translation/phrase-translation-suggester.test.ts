import { createRange } from '../annotations/range';
import { PhraseTranslationSuggester } from './phrase-translation-suggester';
import { TranslationResult } from './translation-result';
import { TranslationResultBuilder } from './translation-result-builder';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';

describe('PhraseTranslationSuggester', () => {
  it('ends at punctuation', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.1);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 0, true, [builder.toResult()]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ends at untranslated word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 2),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    builder.appendToken('a', TranslationSources.None, 0);
    builder.markPhrase(createRange(2, 3), new WordAlignmentMatrix(1, 1, [[0, 0]]));
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 0, true, [builder.toResult()]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is']);
  });

  it('ends at bad word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('bad', TranslationSources.Smt, 0.1);
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.markPhrase(createRange(3, 4), new WordAlignmentMatrix(1, 2, [[0, 1]]));
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(createRange(4, 5), new WordAlignmentMatrix(1, 1, [[0, 0]]));

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 0, true, [builder.toResult()]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a']);
  });

  it('includes incomplete word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt | TranslationSources.Prefix, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 1, false, [builder.toResult()]);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('does not include completed prefix word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt | TranslationSources.Prefix, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 1, true, [builder.toResult()]);
    expect(suggestions[0].targetWords).toEqual(['is', 'a', 'test']);
  });

  it('does not include prefix, partial word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('te', TranslationSources.Prefix, -1);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 1, false, [builder.toResult()]);
    expect(suggestions.length).toEqual(0);
  });

  it('multiple suggestions', () => {
    const results: TranslationResult[] = [];
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    builder.reset();
    builder.appendToken('that', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    builder.reset();
    builder.appendToken('other', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(2);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
    expect(suggestions[1].targetWords).toEqual(['that', 'is', 'a', 'test']);
  });

  it('ignores duplicate suggestion', () => {
    const results: TranslationResult[] = [];
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.', 'segunda', 'frase']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    builder.appendToken('second', TranslationSources.Smt, 0.1);
    builder.appendToken('sentence', TranslationSources.Smt, 0.1);
    builder.markPhrase(
      createRange(5, 7),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    builder.reset();
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 2, [
        [1, 0],
        [2, 1],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    builder.appendToken('second', TranslationSources.Smt, 0.1);
    builder.appendToken('sentence', TranslationSources.Smt, 0.1);
    builder.markPhrase(
      createRange(5, 7),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    const suggester = new PhraseTranslationSuggester(0.2);
    suggester.confidenceThreshold = 0.2;
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ignores good suggestion that starts with punctuation', () => {
    const results: TranslationResult[] = [];
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken(',', TranslationSources.Smt, 0.5);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    builder.reset();
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].targetWords).toEqual(['this', 'is', 'a', 'test']);
  });

  it('ignores all suggestions after a bad suggestion', () => {
    const results: TranslationResult[] = [];
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('were', TranslationSources.Smt, 0.1);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    builder.reset();
    builder.appendToken('this', TranslationSources.Smt, 0.5);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 3, [
        [0, 0],
        [1, 1],
        [2, 2],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );
    results.push(builder.toResult());

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(2, 0, true, results);
    expect(suggestions.length).toEqual(0);
  });

  it('inserted prefix word', () => {
    const builder = new TranslationResultBuilder(['esto', 'es', 'una', 'prueba', '.']);
    builder.appendToken('this', TranslationSources.Smt | TranslationSources.Prefix, 0.5);
    builder.appendToken('is', TranslationSources.Prefix, -1);
    builder.appendToken('is', TranslationSources.Smt, 0.5);
    builder.appendToken('a', TranslationSources.Smt, 0.5);
    builder.markPhrase(
      createRange(0, 3),
      new WordAlignmentMatrix(3, 4, [
        [0, 0],
        [1, 2],
        [2, 3],
      ])
    );
    builder.appendToken('test', TranslationSources.Smt, 0.5);
    builder.appendToken('.', TranslationSources.Smt, 0.1);
    builder.markPhrase(
      createRange(3, 5),
      new WordAlignmentMatrix(2, 2, [
        [0, 0],
        [1, 1],
      ])
    );

    const suggester = new PhraseTranslationSuggester(0.2);
    const suggestions = suggester.getSuggestions(1, 2, true, [builder.toResult()]);
    expect(suggestions.length).toEqual(0);
  });
});
