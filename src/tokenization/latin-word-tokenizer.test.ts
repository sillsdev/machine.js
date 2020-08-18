import { LatinWordTokenizer } from './latin-word-tokenizer';

describe('LatinWordTokenizer', () => {
  it('empty string', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('')).toEqual([]);
  });

  it('whitespace-only string', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize(' ')).toEqual([]);
  });

  it('word with punctuation at the end', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('This is a test, also.')).toEqual(['This', 'is', 'a', 'test', ',', 'also', '.']);
  });

  it('word with punctuation at the beginning', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('Is this a test? (yes)')).toEqual(['Is', 'this', 'a', 'test', '?', '(', 'yes', ')']);
  });

  it('word with internal punctuation', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize("This isn't a test.")).toEqual(['This', "isn't", 'a', 'test', '.']);

    expect(tokenizer.tokenize('He had $5,000.')).toEqual(['He', 'had', '$', '5,000', '.']);
  });

  it('string with symbol', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('He had $50.')).toEqual(['He', 'had', '$', '50', '.']);
  });

  it('string with abbreviations', () => {
    const tokenizer = new LatinWordTokenizer(['mr', 'dr', 'ms']);
    expect(tokenizer.tokenize('Mr. Smith went to Washington.')).toEqual([
      'Mr.',
      'Smith',
      'went',
      'to',
      'Washington',
      '.'
    ]);
  });

  it('string with quotes', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('"This is a test."')).toEqual(['"', 'This', 'is', 'a', 'test', '.', '"']);
  });

  it('string with apostrophe not treated as single quote', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize("“Moses' cat said ‘Meow’ to the dog.”")).toEqual([
      '“',
      "Moses'",
      'cat',
      'said',
      '‘',
      'Meow',
      '’',
      'to',
      'the',
      'dog',
      '.',
      '”'
    ]);

    expect(tokenizer.tokenize("i ha''on 'ot ano'.")).toEqual(['i', "ha''on", "'ot", "ano'", '.']);
  });

  it('string with apostrophe treated as single quote', () => {
    const tokenizer = new LatinWordTokenizer();
    tokenizer.treatApostropheAsSingleQuote = true;
    expect(tokenizer.tokenize("'Moses's cat said 'Meow' to the dog.'")).toEqual([
      "'",
      "Moses's",
      'cat',
      'said',
      "'",
      'Meow',
      "'",
      'to',
      'the',
      'dog',
      '.',
      "'"
    ]);
  });

  it('string with slash', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('This is a test/trial.')).toEqual(['This', 'is', 'a', 'test', '/', 'trial', '.']);
  });

  it('string with angle bracket', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('This is a <<test>>.')).toEqual(['This', 'is', 'a', '<<', 'test', '>>', '.']);
  });

  it('string with a non-ASCII character', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(tokenizer.tokenize('This is—a test.')).toEqual(['This', 'is', '—', 'a', 'test', '.']);
  });
});
