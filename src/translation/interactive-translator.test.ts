import { genSequence } from 'gensequence';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { createRange, Range } from '../annotations/range';
import { MAX_SEGMENT_LENGTH } from './constants';
import { ErrorCorrectionModel } from './error-correction-model';
import { InteractiveTranslationEngine } from './interactive-translation-engine';
import { createInteractiveTranslator, InteractiveTranslator } from './interactive-translator';
import { TranslationSources } from './translation-sources';
import { WordAlignmentMatrix } from './word-alignment-matrix';
import { WordGraph } from './word-graph';
import { WordGraphArc } from './word-graph-arc';

const SOURCE_SEGMENT = ['En', 'el', 'principio', 'la', 'Palabra', 'ya', 'existía', '.'];

describe('InteractiveTranslator', () => {
  it('empty prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    const result = genSequence(translator.getCurrentResults()).first()!;
    expect(result.targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
  });

  it('add one complete word to prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In', true);
    const result = genSequence(translator.getCurrentResults()).first()!;
    expect(result.targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
  });

  it('add one partial word to prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendToPrefix('In', true);
    translator.appendToPrefix('t', false);
    const result = genSequence(translator.getCurrentResults()).first()!;
    expect(result.targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
  });

  it('remove one word from prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendWordsToPrefix(['In', 'the', 'beginning']);
    translator.setPrefix(['In', 'the'], true);
    const result = genSequence(translator.getCurrentResults()).first()!;
    expect(result.targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
  });

  it('remove entire prefix', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendWordsToPrefix(['In', 'the', 'beginning']);
    translator.setPrefix([], true);
    const result = genSequence(translator.getCurrentResults()).first()!;
    expect(result.targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
  });

  it('source segment valid', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    expect(translator.isSourceSegmentValid).toBeTruthy();
  });

  it('source segment invalid', async () => {
    const env = new TestEnvironment();
    const sourceSegment = Array<string>(MAX_SEGMENT_LENGTH + 1);
    sourceSegment.fill('word', 0, -1);
    sourceSegment[sourceSegment.length - 1] = '.';
    when(env.mockedEngine.getWordGraph(deepEqual(sourceSegment))).thenResolve(new WordGraph());

    const translator = await env.createTranslator(sourceSegment);
    expect(translator.isSourceSegmentValid).toBeFalsy();
  });

  it('approve - aligned only', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendWordsToPrefix(['In', 'the', 'beginning']);
    await translator.approve(true);
    verify(
      env.mockedEngine.trainSegment(deepEqual(['En', 'el', 'principio']), deepEqual(['In', 'the', 'beginning']), true)
    ).once();

    translator.appendWordsToPrefix(['the', 'Word', 'already', 'existed', '.']);
    await translator.approve(true);
    verify(
      env.mockedEngine.trainSegment(
        deepEqual(['En', 'el', 'principio', 'la', 'Palabra', 'ya', 'existía', '.']),
        deepEqual(['In', 'the', 'beginning', 'the', 'Word', 'already', 'existed', '.']),
        true
      )
    ).once();
  });

  it('approve - whole source segment', async () => {
    const env = new TestEnvironment();
    const translator = await env.createTranslator();
    translator.appendWordsToPrefix(['In', 'the', 'beginning']);
    await translator.approve(false);
    verify(
      env.mockedEngine.trainSegment(
        deepEqual(['En', 'el', 'principio', 'la', 'Palabra', 'ya', 'existía', '.']),
        deepEqual(['In', 'the', 'beginning']),
        true
      )
    ).once();
  });

  it('multiple suggestions - empty prefix', async () => {
    const env = new TestEnvironment();
    env.useSimpleWordGraph();
    const translator = await env.createTranslator();
    const results = genSequence(translator.getCurrentResults()).take(2).toArray();
    expect(results[0].targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
    expect(results[1].targetSegment.join(' ')).toEqual('In the start the Word already existía .');
  });

  it('multiple suggestions - nonempty prefix', async () => {
    const env = new TestEnvironment();
    env.useSimpleWordGraph();
    const translator = await env.createTranslator();

    translator.appendWordsToPrefix(['In', 'the']);

    let results = genSequence(translator.getCurrentResults()).take(2).toArray();
    expect(results[0].targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
    expect(results[1].targetSegment.join(' ')).toEqual('In the start the Word already existía .');

    translator.appendWordsToPrefix(['beginning']);

    results = genSequence(translator.getCurrentResults()).take(2).toArray();
    expect(results[0].targetSegment.join(' ')).toEqual('In the beginning the Word already existía .');
    expect(results[1].targetSegment.join(' ')).toEqual('In the beginning his Word already existía .');
  });
});

interface AlignedWordPair {
  i: number;
  j: number;
}

function createArc(options: {
  prevState: number;
  nextState: number;
  score: number;
  words: string[];
  wordConfidences: number[];
  sourceSegmentRange: Range;
  isUnknown: boolean;
  alignment: AlignedWordPair[];
}): WordGraphArc {
  const alignment = createAlignment(options.sourceSegmentRange.length, options.words.length, options.alignment);
  return new WordGraphArc(
    options.prevState,
    options.nextState,
    options.score,
    options.words,
    alignment,
    options.sourceSegmentRange,
    new Array<number>(options.words.length).fill(options.isUnknown ? TranslationSources.None : TranslationSources.Smt),
    options.wordConfidences
  );
}

function createAlignment(rowCount: number, columnCount: number, pairs: AlignedWordPair[]): WordAlignmentMatrix {
  const alignment = new WordAlignmentMatrix(rowCount, columnCount);
  for (const pair of pairs) {
    alignment.set(pair.i, pair.j, true);
  }
  return alignment;
}

class TestEnvironment {
  readonly mockedEngine = mock<InteractiveTranslationEngine>();
  readonly ecm: ErrorCorrectionModel = new ErrorCorrectionModel();

  constructor() {
    when(this.mockedEngine.trainSegment(anything(), anything(), anything())).thenResolve();

    const wordGraph = new WordGraph(
      [
        createArc({
          prevState: 0,
          nextState: 1,
          score: -22.4162,
          words: ['now', 'It'],
          wordConfidences: [0.00006755903, 0.0116618536],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            { i: 0, j: 1 },
            { i: 1, j: 0 },
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 2,
          score: -23.5761,
          words: ['In', 'your'],
          wordConfidences: [0.355293363, 0.0000941652761],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 3,
          score: -11.1167,
          words: ['In', 'the'],
          wordConfidences: [0.355293363, 0.5004668],
          sourceSegmentRange: createRange(0, 2),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 4,
          score: -13.7804,
          words: ['In'],
          wordConfidences: [0.355293363],
          sourceSegmentRange: createRange(0, 1),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 3,
          nextState: 5,
          score: -12.9695,
          words: ['beginning'],
          wordConfidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 4,
          nextState: 5,
          score: -7.68319,
          words: ['the', 'beginning'],
          wordConfidences: [0.5004668, 0.348795831],
          sourceSegmentRange: createRange(1, 3),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 4,
          nextState: 3,
          score: -14.4373,
          words: ['the'],
          wordConfidences: [0.5004668],
          sourceSegmentRange: createRange(1, 2),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 5,
          nextState: 6,
          score: -19.3042,
          words: ['his', 'Word'],
          wordConfidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 5,
          nextState: 7,
          score: -8.49148,
          words: ['the', 'Word'],
          wordConfidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 8,
          score: -15.2926,
          words: ['beginning'],
          wordConfidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 2,
          nextState: 9,
          score: -15.2926,
          words: ['beginning'],
          wordConfidences: [0.348795831],
          sourceSegmentRange: createRange(2, 3),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 7,
          nextState: 10,
          score: -14.3453,
          words: ['already'],
          wordConfidences: [0.2259867],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 8,
          nextState: 6,
          score: -19.3042,
          words: ['his', 'Word'],
          wordConfidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 8,
          nextState: 7,
          score: -8.49148,
          words: ['the', 'Word'],
          wordConfidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 9,
          nextState: 6,
          score: -19.3042,
          words: ['his', 'Word'],
          wordConfidences: [0.00347203249, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 9,
          nextState: 7,
          score: -8.49148,
          words: ['the', 'Word'],
          wordConfidences: [0.346071422, 0.477621228],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 6,
          nextState: 10,
          score: -14.0526,
          words: ['already'],
          wordConfidences: [0.2259867],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 10,
          nextState: 11,
          score: 51.1117,
          words: ['existía'],
          wordConfidences: [0.0],
          sourceSegmentRange: createRange(6, 7),
          isUnknown: true,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 12,
          score: -29.0049,
          words: ['you', '.'],
          wordConfidences: [0.005803475, 0.317073762],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 1 }],
        }),
        createArc({
          prevState: 11,
          nextState: 13,
          score: -27.7143,
          words: ['to'],
          wordConfidences: [0.038961038],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 14,
          score: -30.0868,
          words: ['.', '‘'],
          wordConfidences: [0.317073762, 0.06190489],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 15,
          score: -30.1586,
          words: ['.', 'he'],
          wordConfidences: [0.317073762, 0.06702433],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 16,
          score: -28.2444,
          words: ['.', 'the'],
          wordConfidences: [0.317073762, 0.115540564],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 17,
          score: -23.8056,
          words: ['and'],
          wordConfidences: [0.08047272],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 18,
          score: -23.5842,
          words: ['the'],
          wordConfidences: [0.09361572],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 19,
          score: -18.8988,
          words: [','],
          wordConfidences: [0.1428188],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 20,
          score: -11.9218,
          words: ['.', '’'],
          wordConfidences: [0.317073762, 0.018057242],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 11,
          nextState: 21,
          score: -3.51852,
          words: ['.'],
          wordConfidences: [0.317073762],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
      ],
      [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      -191.0998
    );

    when(this.mockedEngine.getWordGraph(deepEqual(SOURCE_SEGMENT))).thenResolve(wordGraph);
  }

  useSimpleWordGraph(): void {
    const wordGraph = new WordGraph(
      [
        createArc({
          prevState: 0,
          nextState: 1,
          score: -10,
          words: ['In', 'the', 'beginning'],
          wordConfidences: [0.5, 0.5, 0.5],
          sourceSegmentRange: createRange(0, 3),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
            { i: 2, j: 2 },
          ],
        }),
        createArc({
          prevState: 0,
          nextState: 1,
          score: -11,
          words: ['In', 'the', 'start'],
          wordConfidences: [0.5, 0.5, 0.4],
          sourceSegmentRange: createRange(0, 3),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
            { i: 2, j: 2 },
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 2,
          score: -10,
          words: ['the', 'Word'],
          wordConfidences: [0.5, 0.5],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 1,
          nextState: 2,
          score: -11,
          words: ['his', 'Word'],
          wordConfidences: [0.4, 0.5],
          sourceSegmentRange: createRange(3, 5),
          isUnknown: false,
          alignment: [
            { i: 0, j: 0 },
            { i: 1, j: 1 },
          ],
        }),
        createArc({
          prevState: 2,
          nextState: 3,
          score: -10,
          words: ['already'],
          wordConfidences: [0.5],
          sourceSegmentRange: createRange(5, 6),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 3,
          nextState: 4,
          score: 50,
          words: ['existía'],
          wordConfidences: [0.0],
          sourceSegmentRange: createRange(6, 7),
          isUnknown: true,
          alignment: [{ i: 0, j: 0 }],
        }),
        createArc({
          prevState: 4,
          nextState: 5,
          score: -10,
          words: ['.'],
          wordConfidences: [0.5],
          sourceSegmentRange: createRange(7, 8),
          isUnknown: false,
          alignment: [{ i: 0, j: 0 }],
        }),
      ],
      [5]
    );

    when(this.mockedEngine.getWordGraph(deepEqual(SOURCE_SEGMENT))).thenResolve(wordGraph);
  }

  createTranslator(segment: string[] = SOURCE_SEGMENT): Promise<InteractiveTranslator> {
    return createInteractiveTranslator(this.ecm, instance(this.mockedEngine), segment);
  }
}
