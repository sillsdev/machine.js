import { UsfmAttribute } from './usfm-attribute';
import { UsfmParserState } from './usfm-parser-state';

export interface UsfmParserHandler {
  startUsfm(state: UsfmParserState): void;
  endUsfm(state: UsfmParserState): void;
  gotMarker(state: UsfmParserState, marker: string): void;
  startBook(state: UsfmParserState, marker: string, code: string): void;
  endBook(state: UsfmParserState, marker: string): void;
  chapter(
    state: UsfmParserState,
    number: string,
    marker: string,
    altNumber: string | undefined,
    pubNumber: string | undefined,
  ): void;
  verse(
    state: UsfmParserState,
    number: string,
    marker: string,
    altNumber: string | undefined,
    pubNumber: string | undefined,
  ): void;
  startPara(
    state: UsfmParserState,
    marker: string,
    unknown: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void;
  endPara(state: UsfmParserState, marker: string): void;
  startChar(
    state: UsfmParserState,
    markerWithoutPlus: string,
    unknown: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void;
  endChar(
    state: UsfmParserState,
    marker: string,
    attributes: readonly UsfmAttribute[] | undefined,
    closed: boolean,
  ): void;
  startNote(state: UsfmParserState, marker: string, caller: string, category: string | undefined): void;
  endNote(state: UsfmParserState, marker: string, closed: boolean): void;
  startTable(state: UsfmParserState): void;
  endTable(state: UsfmParserState): void;
  startRow(state: UsfmParserState, marker: string): void;
  endRow(state: UsfmParserState, marker: string): void;
  startCell(state: UsfmParserState, marker: string, align: string, colspan: number): void;
  endCell(state: UsfmParserState, marker: string): void;
  text(state: UsfmParserState, text: string): void;
  unmatched(state: UsfmParserState, marker: string): void;
  ref(state: UsfmParserState, marker: string, display: string, target: string): void;
  startSidebar(state: UsfmParserState, marker: string, category: string | undefined): void;
  endSidebar(state: UsfmParserState, marker: string, closed: boolean): void;
  optBreak(state: UsfmParserState): void;
  milestone(
    state: UsfmParserState,
    marker: string,
    startMilestone: boolean,
    attributes: readonly UsfmAttribute[] | undefined,
  ): void;
}
