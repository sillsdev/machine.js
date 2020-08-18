import XRegExp from 'xregexp';

const WHITESPACE_REGEX: RegExp = XRegExp('^\\p{Z}$');
const PUNCT_REGEX: RegExp = XRegExp('^\\p{P}$');
const SYMBOL_REGEX: RegExp = XRegExp('^\\p{S}$');
const CONTROL_REGEX: RegExp = XRegExp('^\\p{Cc}$');
const LOWER_REGEX: RegExp = XRegExp('^\\p{Ll}$');

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
