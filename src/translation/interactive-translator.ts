import { genSequence } from 'gensequence';
import { MAX_SEGMENT_LENGTH } from './constants';
import { ErrorCorrectionModel } from './error-correction-model';
import { ErrorCorrectionWordGraphProcessor } from './error-correction-word-graph-processor';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { TranslationResult } from './translation-result';
import { WordGraph } from './word-graph';

export async function createInteractiveTranslator(
  ecm: ErrorCorrectionModel,
  engine: InteractiveTranslationEngine,
  segment: string[],
  sentenceStart: boolean = true
): Promise<InteractiveTranslator> {
  const graph = await engine.getWordGraph(segment);
  return new InteractiveTranslator(ecm, engine, segment, graph, sentenceStart);
}

function sequenceEqual(x: string[], y: string[]): boolean {
  if (x === y) {
    return true;
  }
  if (x.length !== y.length) {
    return false;
  }

  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) {
      return false;
    }
  }
  return true;
}

export class InteractiveTranslator {
  readonly prefix: string[] = [];

  private _isLastWordComplete: boolean = true;
  private readonly wordGraphProcessor: ErrorCorrectionWordGraphProcessor;

  constructor(
    ecm: ErrorCorrectionModel,
    private readonly engine: InteractiveTranslationEngine,
    public readonly sourceSegment: string[],
    private readonly wordGraph: WordGraph,
    private readonly sentenceStart: boolean
  ) {
    this.wordGraphProcessor = new ErrorCorrectionWordGraphProcessor(ecm, this.sourceSegment, this.wordGraph);
    this.correct();
  }

  get isLastWordComplete(): boolean {
    return this._isLastWordComplete;
  }

  get isSourceSegmentValid(): boolean {
    return this.sourceSegment.length <= MAX_SEGMENT_LENGTH;
  }

  setPrefix(prefix: string[], isLastWordComplete: boolean): void {
    if (!sequenceEqual(this.prefix, prefix) || this._isLastWordComplete !== isLastWordComplete) {
      this.prefix.length = 0;
      this.prefix.push(...prefix);
      this._isLastWordComplete = isLastWordComplete;
      this.correct();
    }
  }

  appendToPrefix(addition: string, isLastWordComplete: boolean): void {
    if (addition === '' && this._isLastWordComplete) {
      throw new Error('An empty string cannot be added to a prefix where the last word is complete.');
    }

    if (addition !== '' || this._isLastWordComplete !== isLastWordComplete) {
      if (this.isLastWordComplete) {
        this.prefix.push(addition);
      } else {
        this.prefix[this.prefix.length - 1] = this.prefix[this.prefix.length - 1] + addition;
      }
      this._isLastWordComplete = isLastWordComplete;
      this.correct();
    }
  }

  appendWordsToPrefix(words: string[]): void {
    let updated = false;
    for (const word of words) {
      if (this._isLastWordComplete) {
        this.prefix.push(word);
      } else {
        this.prefix[this.prefix.length - 1] = word;
      }
      this._isLastWordComplete = true;
      updated = true;
    }
    if (updated) {
      this.correct();
    }
  }

  async approve(alignedOnly: boolean): Promise<void> {
    if (!this.isSourceSegmentValid || this.prefix.length > MAX_SEGMENT_LENGTH) {
      return;
    }

    let sourceSegment = this.sourceSegment;
    if (alignedOnly) {
      const bestResult = genSequence(this.getCurrentResults()).first();
      if (bestResult == null) {
        return;
      }
      sourceSegment = bestResult.getAlignedSourceSegment(this.prefix.length);
    }

    if (sourceSegment.length > 0) {
      await this.engine.trainSegment(sourceSegment, this.prefix, this.sentenceStart);
    }
  }

  getCurrentResults(): IterableIterator<TranslationResult> {
    return this.wordGraphProcessor.getResults();
  }

  private correct(): void {
    this.wordGraphProcessor.correct(this.prefix, this.isLastWordComplete);
  }
}
