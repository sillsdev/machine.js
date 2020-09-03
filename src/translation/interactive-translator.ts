import { ErrorCorrectionModel } from './error-correction-model';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { InteractiveTranslationSession } from './interactive-translation-session';

export class InteractiveTranslator {
  readonly errorCorrectionModel: ErrorCorrectionModel = new ErrorCorrectionModel();

  constructor(public readonly engine: InteractiveTranslationEngine) {}

  async startSession(segment: string[], sentenceStart: boolean = true): Promise<InteractiveTranslationSession> {
    const graph = await this.engine.getWordGraph(segment);
    return new InteractiveTranslationSession(this, segment, graph, sentenceStart);
  }
}
