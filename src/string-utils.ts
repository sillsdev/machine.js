import { genSequence } from 'gensequence';
import XRegExp from 'xregexp';

const WHITESPACE_REGEX: RegExp = XRegExp('^\\p{Z}+$');
const PUNCT_REGEX: RegExp = XRegExp('^\\p{P}+$');
const SYMBOL_REGEX: RegExp = XRegExp('^\\p{S}+$');
const CONTROL_REGEX: RegExp = XRegExp('^\\p{Cc}+$');
const LOWER_REGEX: RegExp = XRegExp('^\\p{Ll}+$');
const SENTENCE_TERMINALS: Set<string> = new Set<string>([
  '.',
  '!',
  '?',
  '\u203C',
  '\u203D',
  '\u2047',
  '\u2048',
  '\u2049',
  '\u3002',
  '\uFE52',
  '\uFE57',
  '\uFF01',
  '\uFF0E',
  '\uFF1F',
  '\uFF61',
]);
const QUOTATION_MARKS: Set<string> = new Set<string>([
  '"',
  '“',
  '”',
  '„',
  '‟',
  "'",
  '‘',
  '’',
  '‚',
  '‛',
  '«',
  '»',
  '‹',
  '›',
]);
const DELAYED_SENTENCE_START: Set<string> = new Set<string>(
  genSequence(QUOTATION_MARKS.values()).concat(['(', '[', '<', '{'])
);
const DELAYED_SENTENCE_END: Set<string> = new Set<string>(
  genSequence(QUOTATION_MARKS.values()).concat([')', ']', '>', '}'])
);

export function isWhitespace(c: string): boolean {
  return WHITESPACE_REGEX.test(c);
}

export function isPunctuation(c: string): boolean {
  return PUNCT_REGEX.test(c);
}

export function isSymbol(c: string): boolean {
  return SYMBOL_REGEX.test(c);
}

export function isControl(c: string): boolean {
  return CONTROL_REGEX.test(c);
}

export function isLower(c: string): boolean {
  return LOWER_REGEX.test(c);
}

export function isSentenceTerminal(str: string): boolean {
  return str.length > 0 && genSequence(str).all((c) => SENTENCE_TERMINALS.has(c));
}

export function isDelayedSentenceStart(str: string): boolean {
  return str.length > 0 && genSequence(str).all((c) => DELAYED_SENTENCE_START.has(c));
}

export function isDelayedSentenceEnd(str: string): boolean {
  return str.length > 0 && genSequence(str).all((c) => DELAYED_SENTENCE_END.has(c));
}

export function hasSentenceEnding(str: string): boolean {
  str = str.trimRight();
  for (let i = str.length - 1; i >= 0; i--) {
    if (isSentenceTerminal(str[i])) {
      return true;
    }
    if (!isDelayedSentenceEnd(str[i])) {
      return false;
    }
  }
  return false;
}

export function toTitleCase(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
}

export function toSentenceCase(segment: string[], sentenceStart = true): string[] {
  const result: string[] = [];
  for (let token of segment) {
    if (sentenceStart && isLower(token)) {
      token = toTitleCase(token);
    }
    result.push(token);
    if (isSentenceTerminal(token)) {
      sentenceStart = true;
    } else if (!isDelayedSentenceStart(token)) {
      sentenceStart = false;
    }
  }
  return result;
}
