import { Phrase } from './phrase';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';

export class TranslationResult {
  constructor(
    public readonly sourceSegment: string[],
    public readonly targetSegment: string[],
    public readonly wordConfidences: number[],
    public readonly wordSources: TranslationSources[],
    public readonly alignment: WordAlignmentMatrix,
    public readonly phrases: Phrase[]
  ) {
    if (this.wordConfidences.length !== this.targetSegment.length) {
      throw new Error('The confidences must be the same length as the target segment.');
    }
    if (this.wordSources.length !== this.targetSegment.length) {
      throw new Error('The sources must be the same length as the target segment.');
    }
    if (this.alignment.rowCount !== this.sourceSegment.length) {
      throw new Error('The alignment source length must be the same length as the source segment.');
    }
    if (this.alignment.columnCount !== this.targetSegment.length) {
      throw new Error('The alignment target length must be the same length as the target segment.');
    }
  }

  getAlignedSourceSegment(prefixCount: number): string[] {
    let sourceLength = 0;
    for (const phrase of this.phrases) {
      if (phrase.targetSegmentCut > prefixCount) {
        break;
      }

      if (phrase.sourceSegmentRange.end > sourceLength) {
        sourceLength = phrase.sourceSegmentRange.end;
      }
    }

    return sourceLength === this.sourceSegment.length ? this.sourceSegment : this.sourceSegment.slice(0, sourceLength);
  }
}
