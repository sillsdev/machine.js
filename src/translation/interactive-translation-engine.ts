import { TranslationEngine } from './translation-engine';
import { WordGraph } from './word-graph';

export interface InteractiveTranslationEngine extends TranslationEngine {
  getWordGraph(segment: string): Promise<WordGraph>;
  trainSegment(sourceSegment: string, targetSegment: string, sentenceStart?: boolean): Promise<void>;
}
