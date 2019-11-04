import { TranslationResult } from './translation-result';

export class TranslationSuggestion {
  constructor(
    public readonly result: TranslationResult,
    public readonly targetWordIndices: number[] = [],
    public readonly confidence: number = 0
  ) {}

  get targetWords(): string[] {
    return this.targetWordIndices.map(i => this.result.targetSegment[i]);
  }
}
