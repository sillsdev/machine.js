import { Phrase } from './phrase';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';

export class TranslationResult {
  private readonly _sourceTokens: readonly string[];
  private readonly _targetTokens: readonly string[];
  private readonly _confidences: readonly number[];
  private readonly _sources: readonly TranslationSources[];
  private readonly _phrases: readonly Phrase[];

  constructor(
    public readonly translation: string,
    sourceTokens: Iterable<string>,
    targetTokens: Iterable<string>,
    confidences: Iterable<number>,
    sources: Iterable<TranslationSources>,
    public readonly alignment: WordAlignmentMatrix,
    phrases: Iterable<Phrase>,
  ) {
    this._sourceTokens = Array.from(sourceTokens);
    this._targetTokens = Array.from(targetTokens);
    this._confidences = Array.from(confidences);
    this._sources = Array.from(sources);
    this._phrases = Array.from(phrases);

    if (this.confidences.length !== this.targetTokens.length) {
      throw new Error('The confidences must be the same length as the target segment.');
    }
    if (this.sources.length !== this.targetTokens.length) {
      throw new Error('The sources must be the same length as the target segment.');
    }
    if (this.alignment.rowCount !== this.sourceTokens.length) {
      throw new Error('The alignment source length must be the same length as the source segment.');
    }
    if (this.alignment.columnCount !== this.targetTokens.length) {
      throw new Error('The alignment target length must be the same length as the target segment.');
    }
  }

  get sourceTokens(): readonly string[] {
    return this._sourceTokens;
  }

  get targetTokens(): readonly string[] {
    return this._targetTokens;
  }

  get confidences(): readonly number[] {
    return this._confidences;
  }

  get sources(): readonly TranslationSources[] {
    return this._sources;
  }

  get phrases(): readonly Phrase[] {
    return this._phrases;
  }
}
