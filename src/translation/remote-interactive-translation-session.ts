import { genSequence } from 'gensequence';
import { WebApiClient } from '../web-api/web-api-client';
import { MAX_SEGMENT_LENGTH } from './constants';
import { ErrorCorrectionModel } from './error-correction-model';
import { ErrorCorrectionWordGraphProcessor } from './error-correction-word-graph-processor';
import { HybridInteractiveTranslationResult } from './hybrid-interactive-translation-result';
import { InteractiveTranslationSession } from './interactive-translation-session';
import { TranslationResult } from './translation-result';
import { WordGraph } from './word-graph';

const RULE_ENGINE_THRESHOLD: number = 0.05;

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

export class RemoteInteractiveTranslationSession implements InteractiveTranslationSession {
  readonly prefix: string[] = [];

  private readonly smtWordGraph: WordGraph;
  private readonly ruleResult?: TranslationResult;
  private _isLastWordComplete: boolean = true;
  private readonly wordGraphProcessor: ErrorCorrectionWordGraphProcessor;

  constructor(
    private readonly webApiClient: WebApiClient,
    private readonly ecm: ErrorCorrectionModel,
    private readonly projectId: string,
    public readonly sourceSegment: string[],
    result: HybridInteractiveTranslationResult
  ) {
    this.smtWordGraph = result.smtWordGraph;
    this.ruleResult = result.ruleResult;
    this.wordGraphProcessor = new ErrorCorrectionWordGraphProcessor(this.ecm, this.sourceSegment, this.smtWordGraph);
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
      await this.webApiClient.trainSegmentPair(this.projectId, sourceSegment, this.prefix);
    }
  }

  *getCurrentResults(): IterableIterator<TranslationResult> {
    let prefixCount = this.prefix.length;
    if (!this.isLastWordComplete) {
      prefixCount--;
    }

    for (const smtResult of this.wordGraphProcessor.getResults()) {
      let result = smtResult;
      if (this.ruleResult != null) {
        result = smtResult.merge(prefixCount, RULE_ENGINE_THRESHOLD, this.ruleResult);
      }
      yield result;
    }
  }

  private correct(): void {
    this.wordGraphProcessor.correct(this.prefix, this.isLastWordComplete);
  }
}
