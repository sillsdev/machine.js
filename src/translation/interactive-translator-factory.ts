import { Detokenizer } from '../tokenization/detokenizer';
import { RangeTokenizer } from '../tokenization/range-tokenizer';
import { WHITESPACE_DETOKENIZER } from '../tokenization/whitespace-detokenizer';
import { WHITESPACE_TOKENIZER } from '../tokenization/whitespace-tokenizer';
import { ErrorCorrectionModel } from './error-correction-model';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { InteractiveTranslator } from './interactive-translator';

export class InteractiveTranslatorFactory {
  private readonly errorCorrectionModel = new ErrorCorrectionModel();

  constructor(
    public readonly engine: InteractiveTranslationEngine,
    public targetTokenizer: RangeTokenizer = WHITESPACE_TOKENIZER,
    public targetDetokenizer: Detokenizer = WHITESPACE_DETOKENIZER
  ) {}

  async create(segment: string, sentenceStart = true): Promise<InteractiveTranslator> {
    return new InteractiveTranslator(
      this.errorCorrectionModel,
      this.engine,
      this.targetTokenizer,
      this.targetDetokenizer,
      segment,
      await this.engine.getWordGraph(segment),
      sentenceStart
    );
  }
}
