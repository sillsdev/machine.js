import { describe, it } from 'vitest';

import { UsfmParser } from './usfm-parser';

describe('UsfmParser', () => {
  it('processToken', () => {
    const usfm = `\\id MAT - Test
\\c 1
\\p
\\v 1 This is the first verse.
`;
    const parser = new UsfmParser(usfm);
    parser.processToken();
  });
});
