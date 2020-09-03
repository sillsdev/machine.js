import { Observable } from 'rxjs';
import { HttpClient } from '../web-api/http-client';
import { WebApiClient } from '../web-api/web-api-client';
import { MAX_SEGMENT_LENGTH } from './constants';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { ProgressStatus } from './progress-status';
import { TranslationEngineStats } from './translation-engine-stats';
import { TranslationResult } from './translation-result';
import { TranslationResultBuilder } from './translation-result-builder';
import { WordGraph } from './word-graph';

export class RemoteTranslationEngine implements InteractiveTranslationEngine {
  private readonly webApiClient: WebApiClient;

  constructor(public readonly projectId: string, httpClient: HttpClient) {
    this.webApiClient = new WebApiClient(httpClient);
  }

  async translate(segment: string[]): Promise<TranslationResult> {
    if (segment.length > MAX_SEGMENT_LENGTH) {
      const builder = new TranslationResultBuilder();
      return builder.toResult(segment);
    }
    return await this.webApiClient.translate(this.projectId, segment);
  }

  async translateNBest(n: number, segment: string[]): Promise<TranslationResult[]> {
    if (segment.length > MAX_SEGMENT_LENGTH) {
      return [];
    }
    return await this.webApiClient.translateNBest(this.projectId, n, segment);
  }

  async getWordGraph(segment: string[]): Promise<WordGraph> {
    if (segment.length > MAX_SEGMENT_LENGTH) {
      return new WordGraph();
    }
    return await this.webApiClient.getWordGraph(this.projectId, segment);
  }

  trainSegment(sourceSegment: string[], targetSegment: string[], sentenceStart: boolean = true): Promise<void> {
    return this.webApiClient.trainSegmentPair(this.projectId, sourceSegment, targetSegment, sentenceStart);
  }

  train(): Observable<ProgressStatus> {
    return this.webApiClient.train(this.projectId);
  }

  startTraining(): Promise<void> {
    return this.webApiClient.startTraining(this.projectId);
  }

  listenForTrainingStatus(): Observable<ProgressStatus> {
    return this.webApiClient.listenForTrainingStatus(this.projectId);
  }

  getStats(): Promise<TranslationEngineStats> {
    return this.webApiClient.getEngineStats(this.projectId);
  }
}
