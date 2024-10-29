import { describe, expect, it } from 'vitest';

import { LatinWordDetokenizer } from './latin-word-detokenizer';

describe('LatinWordDetokenizer', () => {
  it('empty token array', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize([])).toEqual('');
  });

  it('word with punctuation at the end', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['This', 'is', 'a', 'test', ',', 'also', '.'])).toEqual('This is a test, also.');
  });

  it('word with punctuation at the beginning', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['Is', 'this', 'a', 'test', '?', '(', 'yes', ')'])).toEqual('Is this a test? (yes)');
  });

  it('array with currency symbol', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['He', 'had', '$', '50', '.'])).toEqual('He had $50.');
  });

  it('array with quotes', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['"', 'This', 'is', 'a', 'test', '.', '"'])).toEqual('"This is a test."');
  });

  it('array with multiple quotes', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(
      detokenizer.detokenize(['“', '‘', "Moses'", '’', 'cat', 'said', '‘', 'Meow', '’', 'to', 'the', 'dog', '.', '”']),
    ).toEqual("“‘Moses'’ cat said ‘Meow’ to the dog.”");

    expect(
      detokenizer.detokenize(['"', "Moses's", 'cat', 'said', "'", 'Meow', "'", 'to', 'the', 'dog', '.', '"']),
    ).toEqual("\"Moses's cat said 'Meow' to the dog.\"");
  });

  it('array with slash', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['This', 'is', 'a', 'test', '/', 'trial', '.'])).toEqual('This is a test/trial.');
  });

  it('array with angle bracket', () => {
    const detokenizer = new LatinWordDetokenizer();
    expect(detokenizer.detokenize(['This', 'is', 'a', '<<', 'test', '>>', '.'])).toEqual('This is a <<test>>.');
  });
});
