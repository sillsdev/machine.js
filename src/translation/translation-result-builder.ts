import { Range } from '../annotations/range';
import { EditOperation } from './edit-operation';
import { Phrase } from './phrase';
import { PhraseInfo } from './phrase-info';
import { TranslationResult } from './translation-result';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';
import { Detokenizer } from '../tokenization/detokenizer';
import { WHITESPACE_DETOKENIZER } from '../tokenization/whitespace-detokenizer';

export class TranslationResultBuilder {
  private readonly _targetTokens: string[] = [];
  private readonly _confidences: number[] = [];
  private readonly _sources: TranslationSources[] = [];
  private readonly _phrases: PhraseInfo[] = [];

  constructor(
    public readonly sourceTokens: readonly string[],
    public targetDetokenizer: Detokenizer = WHITESPACE_DETOKENIZER
  ) {}

  get targetTokens(): readonly string[] {
    return this._targetTokens;
  }

  get confidences(): readonly number[] {
    return this._confidences;
  }

  get sources(): readonly TranslationSources[] {
    return this._sources;
  }

  get phrases(): readonly PhraseInfo[] {
    return this._phrases;
  }

  appendToken(token: string, source: TranslationSources, confidence: number): void {
    this._targetTokens.push(token);
    this._sources.push(source);
    this._confidences.push(confidence);
  }

  markPhrase(sourceSegmentRange: Range, alignment: WordAlignmentMatrix): void {
    this._phrases.push(new PhraseInfo(sourceSegmentRange, this.targetTokens.length, alignment));
  }

  correctPrefix(
    wordOps: EditOperation[],
    charOps: EditOperation[],
    prefix: string[],
    isLastWordComplete: boolean
  ): number {
    let alignmentColsToCopy: number[] = [];
    let i = 0;
    let j = 0;
    let k = 0;
    for (const wordOp of wordOps) {
      switch (wordOp) {
        case EditOperation.Insert:
          this._targetTokens.splice(j, 0, prefix[j]);
          this._sources.splice(j, 0, TranslationSources.Prefix);
          this._confidences.splice(j, 0, -1);
          alignmentColsToCopy.push(-1);
          for (let l = k; l < this.phrases.length; l++) {
            this.phrases[l].targetCut++;
          }
          j++;
          break;

        case EditOperation.Delete:
          this._targetTokens.splice(j, 1);
          this._sources.splice(j, 1);
          this._confidences.splice(j, 1);
          i++;
          if (k < this.phrases.length) {
            for (let l = k; l < this.phrases.length; l++) {
              this.phrases[l].targetCut--;
            }

            if (
              this.phrases[k].targetCut <= 0 ||
              (k > 0 && this.phrases[k].targetCut === this.phrases[k - 1].targetCut)
            ) {
              this._phrases.splice(k, 1);
              alignmentColsToCopy = [];
              i = 0;
            } else if (j >= this.phrases[k].targetCut) {
              this.resizeAlignment(k, alignmentColsToCopy);
              alignmentColsToCopy = [];
              i = 0;
              k++;
            }
          }
          break;

        case EditOperation.Hit:
        case EditOperation.Substitute:
          if (wordOp === EditOperation.Substitute || j < prefix.length - 1 || isLastWordComplete) {
            this._targetTokens[j] = prefix[j];
          } else {
            this._targetTokens[j] = this.correctWord(charOps, this.targetTokens[j], prefix[j]);
          }

          if (wordOp === EditOperation.Substitute) {
            this._confidences[j] = -1;
            this._sources[j] = TranslationSources.Prefix;
          } else {
            this._sources[j] |= TranslationSources.Prefix;
          }

          alignmentColsToCopy.push(i);

          i++;
          j++;
          if (k < this.phrases.length && j >= this.phrases[k].targetCut) {
            this.resizeAlignment(k, alignmentColsToCopy);
            alignmentColsToCopy = [];
            i = 0;
            k++;
          }
          break;
      }
    }

    while (j < this.targetTokens.length) {
      alignmentColsToCopy.push(i);

      i++;
      j++;
      if (k < this.phrases.length && j >= this.phrases[k].targetCut) {
        this.resizeAlignment(k, alignmentColsToCopy);
        alignmentColsToCopy = [];
        break;
      }
    }

    return alignmentColsToCopy.length;
  }

  reset(): void {
    this._targetTokens.length = 0;
    this._confidences.length = 0;
    this._sources.length = 0;
    this._phrases.length = 0;
  }

  toResult(translation?: string): TranslationResult {
    const confidences = this.confidences.slice();
    const sources = new Array<TranslationSources>(this.targetTokens.length);
    const alignment = new WordAlignmentMatrix(this.sourceTokens.length, this.targetTokens.length);
    const phrases: Phrase[] = [];
    let trgPhraseStartIndex = 0;
    for (const phraseInfo of this.phrases) {
      for (let j = trgPhraseStartIndex; j < phraseInfo.targetCut; j++) {
        for (let i = phraseInfo.sourceSegmentRange.start; i < phraseInfo.sourceSegmentRange.end; i++) {
          const aligned = phraseInfo.alignment.get(i - phraseInfo.sourceSegmentRange.start, j - trgPhraseStartIndex);
          if (aligned) {
            alignment.set(i, j, true);
          }
        }

        sources[j] = this.sources[j];
      }

      phrases.push(new Phrase(phraseInfo.sourceSegmentRange, phraseInfo.targetCut));
      trgPhraseStartIndex = phraseInfo.targetCut;
    }

    return new TranslationResult(
      translation ?? this.targetDetokenizer.detokenize(this.targetTokens),
      this.sourceTokens,
      this.targetTokens,
      confidences,
      sources,
      alignment,
      phrases
    );
  }

  private resizeAlignment(phraseIndex: number, colsToCopy: number[]): void {
    const curAlignment = this.phrases[phraseIndex].alignment;
    if (colsToCopy.length === curAlignment.columnCount) {
      return;
    }

    const newAlignment = new WordAlignmentMatrix(curAlignment.rowCount, colsToCopy.length);
    for (let j = 0; j < newAlignment.columnCount; j++) {
      if (colsToCopy[j] !== -1) {
        for (let i = 0; i < newAlignment.rowCount; i++) {
          newAlignment.set(i, j, curAlignment.get(i, colsToCopy[j]));
        }
      }
    }

    this.phrases[phraseIndex].alignment = newAlignment;
  }

  private correctWord(charOps: EditOperation[], word: string, prefix: string): string {
    let corrected = '';
    let i = 0;
    let j = 0;
    for (const charOp of charOps) {
      switch (charOp) {
        case EditOperation.Hit:
          corrected += word[i];
          i++;
          j++;
          break;

        case EditOperation.Insert:
          corrected += prefix[j];
          j++;
          break;

        case EditOperation.Delete:
          i++;
          break;

        case EditOperation.Substitute:
          corrected += prefix[j];
          i++;
          j++;
          break;
      }
    }

    corrected += word.substring(i);
    return corrected;
  }
}
