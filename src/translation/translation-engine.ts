import { TranslationResult } from './translation-result';

export interface TranslationEngine {
  translate(segment: string): Promise<TranslationResult>;
  translateN(n: number, segment: string): Promise<readonly TranslationResult[]>;
}
