import { genSequence } from 'gensequence';
import { Range } from '../annotations/range';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';

export class WordGraphArc {
  constructor(
    public readonly prevState: number,
    public readonly nextState: number,
    public readonly score: number,
    public readonly targetTokens: string[],
    public readonly alignment: WordAlignmentMatrix,
    public readonly sourceSegmentRange: Range,
    public readonly sources: TranslationSources[],
    public readonly confidences: number[]
  ) {}

  get isUnknown(): boolean {
    return genSequence(this.sources).all((s) => s === TranslationSources.None);
  }
}
