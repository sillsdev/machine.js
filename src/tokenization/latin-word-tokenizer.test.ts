import { LatinWordTokenizer } from './latin-word-tokenizer';

describe('LatinWordTokenizer', () => {
  it('empty string', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize(''))).toEqual([]);
  });

  it('whitespace-only string', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize(' '))).toEqual([]);
  });

  it('word with punctuation at the end', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('This is a test, also.'))).toEqual([
      'This',
      'is',
      'a',
      'test',
      ',',
      'also',
      '.',
    ]);
  });

  it('word with punctuation at the beginning', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('Is this a test? (yes)'))).toEqual([
      'Is',
      'this',
      'a',
      'test',
      '?',
      '(',
      'yes',
      ')',
    ]);
  });

  it('word with internal punctuation', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize("This isn't a test."))).toEqual(['This', "isn't", 'a', 'test', '.']);

    expect(Array.from(tokenizer.tokenize('He had $5,000.'))).toEqual(['He', 'had', '$', '5,000', '.']);
  });

  it('string with symbol', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('He had $50.'))).toEqual(['He', 'had', '$', '50', '.']);
  });

  it('string with abbreviations', () => {
    const tokenizer = new LatinWordTokenizer(['mr', 'dr', 'ms']);
    expect(Array.from(tokenizer.tokenize('Mr. Smith went to Washington.'))).toEqual([
      'Mr.',
      'Smith',
      'went',
      'to',
      'Washington',
      '.',
    ]);
  });

  it('string with quotes', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('"This is a test."'))).toEqual(['"', 'This', 'is', 'a', 'test', '.', '"']);
  });

  it('string with apostrophe not treated as single quote', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize("“Moses' cat said ‘Meow’ to the dog.”"))).toEqual([
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
      '”',
    ]);

    expect(Array.from(tokenizer.tokenize("i ha''on 'ot ano'."))).toEqual(['i', "ha''on", "'ot", "ano'", '.']);
  });

  it('string with apostrophe treated as single quote', () => {
    const tokenizer = new LatinWordTokenizer();
    tokenizer.treatApostropheAsSingleQuote = true;
    expect(Array.from(tokenizer.tokenize("'Moses's cat said 'Meow' to the dog.'"))).toEqual([
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
      "'",
    ]);
  });

  it('string with slash', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('This is a test/trial.'))).toEqual([
      'This',
      'is',
      'a',
      'test',
      '/',
      'trial',
      '.',
    ]);
  });

  it('string with angle bracket', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('This is a <<test>>.'))).toEqual(['This', 'is', 'a', '<<', 'test', '>>', '.']);
  });

  it('string with a non-ASCII character', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('This is—a test.'))).toEqual(['This', 'is', '—', 'a', 'test', '.']);
  });

  it('string with email address', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('This is an email address, name@test.com, in a sentence.'))).toEqual([
      'This',
      'is',
      'an',
      'email',
      'address',
      ',',
      'name@test.com',
      ',',
      'in',
      'a',
      'sentence',
      '.',
    ]);
  });

  it('string with email address at end of sentence', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('Here is an email address: name@test.com.'))).toEqual([
      'Here',
      'is',
      'an',
      'email',
      'address',
      ':',
      'name@test.com',
      '.',
    ]);
  });

  it('string with URL', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(
      Array.from(tokenizer.tokenize('This is an email address, http://www.test.com/page.html, in a sentence.')),
    ).toEqual([
      'This',
      'is',
      'an',
      'email',
      'address',
      ',',
      'http://www.test.com/page.html',
      ',',
      'in',
      'a',
      'sentence',
      '.',
    ]);
  });

  it('string with URL at end of sentence', () => {
    const tokenizer = new LatinWordTokenizer();
    expect(Array.from(tokenizer.tokenize('Here is a url: http://www.test.com/page.html?param=1.'))).toEqual([
      'Here',
      'is',
      'a',
      'url',
      ':',
      'http://www.test.com/page.html?param=1',
      '.',
    ]);
  });
});
