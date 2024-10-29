import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { USFM_TEST_PROJECT_PATH } from './test-helpers';
import { createUsfmStylesheet } from './usfm-stylesheet';
import { UsfmTokenType } from './usfm-token';
import { UsfmTokenizer } from './usfm-tokenizer';

describe('UsfmTokenizer', () => {
  it('tokenize', async () => {
    const usfm = readUsfm();
    const tokenizer = new UsfmTokenizer(await createUsfmStylesheet());
    const tokens = tokenizer.tokenize(usfm);
    expect(tokens.length).toEqual(236);

    expect(tokens[0].type).toEqual(UsfmTokenType.Book);
    expect(tokens[0].marker).toEqual('id');
    expect(tokens[0].data).toEqual('MAT');
    expect(tokens[0].lineNumber).toEqual(1);
    expect(tokens[0].columnNumber).toEqual(1);

    expect(tokens[37].type).toEqual(UsfmTokenType.Text);
    expect(tokens[37].text).toEqual('Chapter One ');
    expect(tokens[37].lineNumber).toEqual(10);
    expect(tokens[37].columnNumber).toEqual(4);

    expect(tokens[38].type).toEqual(UsfmTokenType.Verse);
    expect(tokens[38].marker).toEqual('v');
    expect(tokens[38].data).toEqual('1');
    expect(tokens[38].lineNumber).toEqual(11);
    expect(tokens[38].columnNumber).toEqual(1);

    expect(tokens[47].type).toEqual(UsfmTokenType.Note);
    expect(tokens[47].marker).toEqual('f');
    expect(tokens[47].data).toEqual('+');
    expect(tokens[47].lineNumber).toEqual(11);
    expect(tokens[47].columnNumber).toEqual(52);
  });

  it('detokenize', async () => {
    const usfm = readUsfm();
    const tokenizer = new UsfmTokenizer(await createUsfmStylesheet());
    const tokens = tokenizer.tokenize(usfm);
    const result = tokenizer.detokenize(tokens);
    expect(result).toEqual(usfm);
  });

  it('tokenize ending paragraph marker', async () => {
    const usfm = `\\id MAT - Test
\\c 1
\\v 1 Descriptive title\\x - \\xo 18:16 \\xt  hello world\\x*\\p`;
    const tokenizer = new UsfmTokenizer(await createUsfmStylesheet());
    const tokens = tokenizer.tokenize(usfm);
    expect(tokens.length).toEqual(13);
  });
});

function readUsfm(): string {
  return readFileSync(join(USFM_TEST_PROJECT_PATH, '41MATTes.SFM'), 'utf8');
}
