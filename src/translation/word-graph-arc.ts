import { Range } from '../annotations/range';
import { all } from '../iterable-utils';
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
    public readonly confidences: number[],
  ) {}

  get isUnknown(): boolean {
    return all(this.sources, (s) => s === TranslationSources.None);
  }
}
