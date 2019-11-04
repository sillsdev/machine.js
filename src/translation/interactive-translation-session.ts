import { TranslationResult } from './translation-result';

export interface InteractiveTranslationSession {
  readonly sourceSegment: string[];
  readonly prefix: string[];
  readonly isLastWordComplete: boolean;

  setPrefix(prefix: string[], isLastWordComplete: boolean): void;
  appendToPrefix(addition: string, isLastWordComplete: boolean): void;
  appendWordsToPrefix(words: string[]): void;
  approve(alignedOnly: boolean): Promise<void>;
  getCurrentResults(): IterableIterator<TranslationResult>;
}
