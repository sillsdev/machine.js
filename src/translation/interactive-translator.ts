import { genSequence } from 'gensequence';
import { MAX_SEGMENT_LENGTH } from './constants';
import { ErrorCorrectionModel } from './error-correction-model';
import { ErrorCorrectionWordGraphProcessor } from './error-correction-word-graph-processor';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { TranslationResult } from './translation-result';
import { WordGraph } from './word-graph';
import { RangeTokenizer } from '../tokenization/range-tokenizer';
import { Detokenizer } from '../tokenization/detokenizer';
import { Range } from '../annotations/range';
import { getRanges, split } from '../tokenization/tokenizer-utils';

export class InteractiveTranslator {
  private _prefix = '';
  private _isLastWordComplete = true;
  private _prefixWordRanges: readonly Range[] = [];
  private readonly wordGraphProcessor: ErrorCorrectionWordGraphProcessor;
  private readonly _segmentWordRanges: readonly Range[];

  constructor(
    ecm: ErrorCorrectionModel,
    private readonly engine: InteractiveTranslationEngine,
    private readonly targetTokenizer: RangeTokenizer,
    targetDetokenizer: Detokenizer,
    public readonly segment: string,
    private readonly wordGraph: WordGraph,
    private readonly sentenceStart: boolean
  ) {
    this.wordGraphProcessor = new ErrorCorrectionWordGraphProcessor(ecm, targetDetokenizer, this.wordGraph);
    this._segmentWordRanges = Array.from(getRanges(this.segment, wordGraph.sourceTokens));
    this.correct();
  }

  get segmentWordRanges(): readonly Range[] {
    return this._segmentWordRanges;
  }

  get prefix(): string {
    return this._prefix;
  }

  get prefixWordRanges(): readonly Range[] {
    return this._prefixWordRanges;
  }

  get isLastWordComplete(): boolean {
    return this._isLastWordComplete;
  }

  get isSegmentValid(): boolean {
    return this.segment.length <= MAX_SEGMENT_LENGTH;
  }

  setPrefix(prefix: string, isLastWordComplete?: boolean): void {
    if (this._prefix !== prefix || (isLastWordComplete != null && isLastWordComplete !== this._isLastWordComplete)) {
      this._prefix = prefix;
      this.correct(isLastWordComplete);
    }
  }

  appendToPrefix(addition: string, isLastWordComplete?: boolean): void {
    if (addition !== '' || (isLastWordComplete != null && isLastWordComplete !== this._isLastWordComplete)) {
      this._prefix += addition;
      this.correct(isLastWordComplete);
    }
  }

  async approve(alignedOnly: boolean): Promise<void> {
    if (!this.isSegmentValid || this.prefixWordRanges.length > MAX_SEGMENT_LENGTH) {
      return;
    }

    let segmentWordRanges = this.segmentWordRanges;
    if (alignedOnly) {
      const bestResult = genSequence(this.getCurrentResults()).first();
      if (bestResult == null) {
        return;
      }
      segmentWordRanges = this.getAlignedSourceSegment(bestResult);
    }

    if (segmentWordRanges.length > 0) {
      const sourceSegment = this.segment.substring(
        segmentWordRanges[0].start,
        segmentWordRanges[segmentWordRanges.length - 1].end
      );
      const targetSegment = this._prefix.substring(
        this.prefixWordRanges[0].start,
        this.prefixWordRanges[this.prefixWordRanges.length - 1].end
      );
      await this.engine.trainSegment(sourceSegment, targetSegment, this.sentenceStart);
    }
  }

  getCurrentResults(): IterableIterator<TranslationResult> {
    return this.wordGraphProcessor.getResults();
  }

  private correct(isLastWordComplete?: boolean): void {
    this._prefixWordRanges = Array.from(this.targetTokenizer.tokenizeAsRanges(this.prefix));
    if (isLastWordComplete != null) {
      this._isLastWordComplete = isLastWordComplete;
    } else {
      this._isLastWordComplete =
        this.prefixWordRanges.length === 0 ||
        this.prefixWordRanges[this.prefixWordRanges.length - 1].end < this.prefix.length;
    }
    this.wordGraphProcessor.correct(split(this.prefix, this.prefixWordRanges), this.isLastWordComplete);
  }

  private getAlignedSourceSegment(result: TranslationResult): readonly Range[] {
    let sourceLength = 0;
    for (const phrase of result.phrases) {
      if (phrase.targetSegmentCut > this.prefixWordRanges.length) {
        break;
      }

      if (phrase.sourceSegmentRange.end > sourceLength) {
        sourceLength = phrase.sourceSegmentRange.end;
      }
    }

    return sourceLength === this.segmentWordRanges.length
      ? this.segmentWordRanges
      : this.segmentWordRanges.slice(0, sourceLength);
  }
}
