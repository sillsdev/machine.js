import { UsfmAttribute } from './usfm-attribute';
import { UsfmParserHandler } from './usfm-parser-handler';
import { UsfmParserState } from './usfm-parser-state';

export class UsfmParserHandlerBase implements UsfmParserHandler {
  startUsfm(_state: UsfmParserState): void {}

  endUsfm(_state: UsfmParserState): void {}

  gotMarker(_state: UsfmParserState, _marker: string): void {}

  startBook(_state: UsfmParserState, _marker: string, _code: string): void {}

  endBook(_state: UsfmParserState, _marker: string): void {}

  chapter(
    _state: UsfmParserState,
    _number: string,
    _marker: string,
    _altNumber: string | undefined,
    _pubNumber: string | undefined,
  ): void {}

  verse(
    _state: UsfmParserState,
    _number: string,
    _marker: string,
    _altNumber: string | undefined,
    _pubNumber: string | undefined,
  ): void {}

  startPara(
    _state: UsfmParserState,
    _marker: string,
    _unknown: boolean,
    _attributes: readonly UsfmAttribute[] | undefined,
  ): void {}

  endPara(_state: UsfmParserState, _marker: string): void {}

  startChar(
    _state: UsfmParserState,
    _markerWithoutPlus: string,
    _unknown: boolean,
    _attributes: readonly UsfmAttribute[] | undefined,
  ): void {}

  endChar(
    _state: UsfmParserState,
    _marker: string,
    _attributes: readonly UsfmAttribute[] | undefined,
    _closed: boolean,
  ): void {}

  startNote(_state: UsfmParserState, _marker: string, _caller: string, _category: string | undefined): void {}

  endNote(_state: UsfmParserState, _marker: string, _closed: boolean): void {}

  startTable(_state: UsfmParserState): void {}

  endTable(_state: UsfmParserState): void {}

  startRow(_state: UsfmParserState, _marker: string): void {}

  endRow(_state: UsfmParserState, _marker: string): void {}

  startCell(_state: UsfmParserState, _marker: string, _align: string, _colspan: number): void {}

  endCell(_state: UsfmParserState, _marker: string): void {}

  text(_state: UsfmParserState, _text: string): void {}

  unmatched(_state: UsfmParserState, _marker: string): void {}

  ref(_state: UsfmParserState, _marker: string, _display: string, _target: string): void {}

  startSidebar(_state: UsfmParserState, _marker: string, _category: string | undefined): void {}

  endSidebar(_state: UsfmParserState, _marker: string, _closed: boolean): void {}

  optBreak(_state: UsfmParserState): void {}

  milestone(
    _state: UsfmParserState,
    _marker: string,
    _startMilestone: boolean,
    _attributes: readonly UsfmAttribute[] | undefined,
  ): void {}
}
