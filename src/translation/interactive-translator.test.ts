import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { createRange, Range } from '../annotations/range';
import { first, take } from '../iterable-utils';
import { MAX_SEGMENT_LENGTH } from './constants';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { InteractiveTranslator } from './interactive-translator';
import { InteractiveTranslatorFactory } from './interactive-translator-factory';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';
import { WordGraph } from './word-graph';
import { WordGraphArc } from './word-graph-arc';

const SOURCE_SEGMENT = 'En el principio la Palabra ya existía .';

describe('InteractiveTranslator', () => {
  it('empty prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already existía .');
  });

  it('add one complete word to prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In ');
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already existía .');
  });

  it('add one partial word to prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In ');
    translator.appendToPrefix('t');
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already existía .');
  });

  it('force last word to be complete', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In the beginning the Word already exist', true);
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already exist .');
  });

  it('remove one word from prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In the beginning ');
    translator.setPrefix('In the ');
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already existía .');
  });

  it('remove entire prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In the beginning ');
    translator.setPrefix('');
    const result = first(translator.getCurrentResults());
    expect(result.translation).toEqual('In the beginning the Word already existía .');
  });

  it('source segment valid', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    expect(translator.isSegmentValid).toBeTruthy();
  });

  it('source segment invalid', async () => {
    const env = new TestEnvironment();
    const sourceTokens = Array<string>(MAX_SEGMENT_LENGTH + 1);
    sourceTokens.fill('word', 0, -1);
    sourceTokens[sourceTokens.length - 1] = '.';
    const sourceSegment = sourceTokens.join();
    when(env.mockedEngine.getWordGraph(sourceSegment)).thenResolve(new WordGraph(sourceTokens));

    const translator = await env.createTranslator(sourceSegment);
    expect(translator.isSegmentValid).toBeFalsy();
  });

  it('approve - aligned only', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In the beginning ');
    await translator.approve(true);
    verify(env.mockedEngine.trainSegment('En el principio', 'In the beginning', true)).once();

    translator.appendToPrefix('the Word already existed .');
    await translator.approve(true);
    verify(
      env.mockedEngine.trainSegment(
        'En el principio la Palabra ya existía .',
        'In the beginning the Word already existed .',
        true
      )
    ).once();
  });

  it('approve - whole source segment', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In the beginning ');
    await translator.approve(false);
    verify(env.mockedEngine.trainSegment('En el principio la Palabra ya existía .', 'In the beginning', true)).once();
  });

  it('multiple suggestions - empty prefix', async () => {
    const env = new TestEnvironment();
    env.useSimpleWordGraph();
    const translator = await env.createTranslator();
    const results = Array.from(take(translator.getCurrentResults(), 2));
    expect(results[0].translation).toEqual('In the beginning the Word already existía .');
    expect(results[1].translation).toEqual('In the start the Word already existía .');
  });

  it('multiple suggestions - nonempty prefix', async () => {
    const env = new TestEnvironment();
    env.useSimpleWordGraph();
    const translator = await env.createTranslator();

    translator.appendToPrefix('In the ');

    let results = Array.from(take(translator.getCurrentResults(), 2));
    expect(results[0].translation).toEqual('In the beginning the Word already existía .');
    expect(results[1].translation).toEqual('In the start the Word already existía .');

    translator.appendToPrefix('beginning ');

    results = Array.from(take(translator.getCurrentResults(), 2));
    expect(results[0].translation).toEqual('In the beginning the Word already existía .');
    expect(results[1].translation).toEqual('In the beginning his Word already existía .');
  });
});

function createArc(options: {
  prevState: number;
  nextState: number;
  score: number;
  tokens: string[];
  confidences: number[];
  sourceSegmentRange: Range;
  isUnknown: boolean;
  alignment: [number, number][];
}): WordGraphArc {
  return new WordGraphArc(
    options.prevState,
    options.nextState,
    options.score,
    options.tokens,
    new WordAlignmentMatrix(options.sourceSegmentRange.length, options.tokens.length, options.alignment),
    options.sourceSegmentRange,
    new Array<number>(options.tokens.length).fill(options.isUnknown ? TranslationSources.None : TranslationSources.Smt),
    options.confidences
  );
}

class TestEnvironment {
  readonly mockedEngine = mock<InteractiveTranslationEngine>();
  readonly factory: InteractiveTranslatorFactory;

  constructor() {
    this.factory = new InteractiveTranslatorFactory(instance(this.mockedEngine));

    when(this.mockedEngine.trainSegment(anything(), anything(), anything())).thenResolve();

    const wordGraph = new WordGraph(
      SOURCE_SEGMENT.split(' '),
      [
        createArc({
          prevState: 0,
          nextState: 1,
          score: -22.4162,
          tokens: ['now', 'It'],
          confidences: [0.00006755903, 0.0116618536],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            [0, 1],
            [1, 0],
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 2,
          score: -23.5761,
          tokens: ['In', 'your'],
          confidences: [0.355293363, 0.0000941652761],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 3,
          score: -11.1167,
          tokens: ['In', 'the'],
          confidences: [0.355293363, 0.5004668],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 4,
          score: -13.7804,
          tokens: ['In'],
          confidences: [0.355293363],
          sourceSegmentRange: createRange(0, 1),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 3,
          nextState: 5,
          score: -12.9695,
          tokens: ['beginning'],
          confidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 4,
          nextState: 5,
          score: -7.68319,
          tokens: ['the', 'beginning'],
          confidences: [0.5004668, 0.348795831],
          sourceSegmentRange: createRange(1, 3),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 4,
          nextState: 3,
          score: -14.4373,
          tokens: ['the'],
          confidences: [0.5004668],
          sourceSegmentRange: createRange(1, 2),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 5,
          nextState: 6,
          score: -19.3042,
          tokens: ['his', 'Word'],
          confidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 5,
          nextState: 7,
          score: -8.49148,
          tokens: ['the', 'Word'],
          confidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 8,
          score: -15.2926,
          tokens: ['beginning'],
          confidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 2,
          nextState: 9,
          score: -15.2926,
          tokens: ['beginning'],
          confidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 7,
          nextState: 10,
          score: -14.3453,
          tokens: ['already'],
          confidences: [0.2259867],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 8,
          nextState: 6,
          score: -19.3042,
          tokens: ['his', 'Word'],
          confidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 8,
          nextState: 7,
          score: -8.49148,
          tokens: ['the', 'Word'],
          confidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 9,
          nextState: 6,
          score: -19.3042,
          tokens: ['his', 'Word'],
          confidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 9,
          nextState: 7,
          score: -8.49148,
          tokens: ['the', 'Word'],
          confidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 6,
          nextState: 10,
          score: -14.0526,
          tokens: ['already'],
          confidences: [0.2259867],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 10,
          nextState: 11,
          score: 51.1117,
          tokens: ['existía'],
          confidences: [0.0],
          sourceSegmentRange: createRange(6, 7),
          isUnknown: true,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 12,
          score: -29.0049,
          tokens: ['you', '.'],
          confidences: [0.005803475, 0.317073762],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 1]],
        }),
        createArc({
          prevState: 11,
          nextState: 13,
          score: -27.7143,
          tokens: ['to'],
          confidences: [0.038961038],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 14,
          score: -30.0868,
          tokens: ['.', '‘'],
          confidences: [0.317073762, 0.06190489],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 15,
          score: -30.1586,
          tokens: ['.', 'he'],
          confidences: [0.317073762, 0.06702433],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 16,
          score: -28.2444,
          tokens: ['.', 'the'],
          confidences: [0.317073762, 0.115540564],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 17,
          score: -23.8056,
          tokens: ['and'],
          confidences: [0.08047272],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 18,
          score: -23.5842,
          tokens: ['the'],
          confidences: [0.09361572],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 19,
          score: -18.8988,
          tokens: [','],
          confidences: [0.1428188],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 20,
          score: -11.9218,
          tokens: ['.', '’'],
          confidences: [0.317073762, 0.018057242],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 11,
          nextState: 21,
          score: -3.51852,
          tokens: ['.'],
          confidences: [0.317073762],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
      ],
      [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      -191.0998
    );

    when(this.mockedEngine.getWordGraph(deepEqual(SOURCE_SEGMENT))).thenResolve(wordGraph);
  }

  useSimpleWordGraph(): void {
    const wordGraph = new WordGraph(
      SOURCE_SEGMENT.split(' '),
      [
        createArc({
          prevState: 0,
          nextState: 1,
          score: -10,
          tokens: ['In', 'the', 'beginning'],
          confidences: [0.5, 0.5, 0.5],
          sourceSegmentRange: createRange(0, 3),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 1,
          score: -11,
          tokens: ['In', 'the', 'start'],
          confidences: [0.5, 0.5, 0.4],
          sourceSegmentRange: createRange(0, 3),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 2,
          score: -10,
          tokens: ['the', 'Word'],
          confidences: [0.5, 0.5],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 2,
          score: -11,
          tokens: ['his', 'Word'],
          confidences: [0.4, 0.5],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            [0, 0],
            [1, 1],
          ],
        }),
        createArc({
          prevState: 2,
          nextState: 3,
          score: -10,
          tokens: ['already'],
          confidences: [0.5],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 3,
          nextState: 4,
          score: 50,
          tokens: ['existía'],
          confidences: [0.0],
          sourceSegmentRange: createRange(6, 7),
          isUnknown: true,
          alignment: [[0, 0]],
        }),
        createArc({
          prevState: 4,
          nextState: 5,
          score: -10,
          tokens: ['.'],
          confidences: [0.5],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [[0, 0]],
        }),
      ],
      [5]
    );

    when(this.mockedEngine.getWordGraph(deepEqual(SOURCE_SEGMENT))).thenResolve(wordGraph);
  }

  createTranslator(segment: string = SOURCE_SEGMENT): Promise<InteractiveTranslator> {
    return this.factory.create(segment);
  }
}
