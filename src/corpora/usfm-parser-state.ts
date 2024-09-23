import { ScrVers, VerseRef } from '@sillsdev/scripture';

import { any, firstOrUndefined, lastOrUndefined } from '../iterable-utils';
import { UsfmAttribute } from './usfm-attribute';
import { UsfmStylesheet } from './usfm-stylesheet';
import { UsfmTag, UsfmTextType } from './usfm-tag';
import { UsfmToken } from './usfm-token';

export enum UsfmElementType {
  Book,
  Para,
  Char,
  Table,
  Row,
  Cell,
  Note,
  Sidebar,
}

export class UsfmParserElement {
  constructor(
    public readonly type: UsfmElementType,
    public readonly marker?: string,
    public readonly attributes?: readonly UsfmAttribute[],
  ) {}
}

export class UsfmParserState {
  public verseRef: VerseRef;
  public verseOffset = 0;
  public lineNumber = 1;
  public columnNumber = 0;
  public index = -1;
  public specialToken = false;
  public specialTokenCount = 0;

  private readonly _stack: UsfmParserElement[] = [];

  constructor(
    public readonly stylesheet: UsfmStylesheet,
    versification: ScrVers,
    public readonly tokens: readonly UsfmToken[],
  ) {
    this.verseRef = new VerseRef(versification);
  }

  get token(): UsfmToken | undefined {
    return this.index >= 0 ? this.tokens[this.index] : undefined;
  }

  get prevToken(): UsfmToken | undefined {
    return this.index >= 1 ? this.tokens[this.index - 1] : undefined;
  }

  get stack(): readonly UsfmParserElement[] {
    return this._stack;
  }

  get isFigure(): boolean {
    return this.charTag?.marker === 'fig';
  }

  get paraTag(): UsfmTag | undefined {
    const elem = lastOrUndefined(
      this._stack,
      (elem) =>
        elem.type === UsfmElementType.Para ||
        elem.type === UsfmElementType.Book ||
        elem.type === UsfmElementType.Row ||
        elem.type === UsfmElementType.Sidebar,
    );
    if (elem?.marker != null) {
      return this.stylesheet.getTag(elem.marker);
    }
    return undefined;
  }

  get charTag(): UsfmTag | undefined {
    return firstOrUndefined(this.charTags);
  }

  get charTags(): IterableIterator<UsfmTag> {
    return this.getCharTags();
  }

  get noteTag(): UsfmTag | undefined {
    const elem = lastOrUndefined(this._stack, (elem) => elem.type === UsfmElementType.Note);
    if (elem?.marker != null) {
      return this.stylesheet.getTag(elem.marker);
    }
    return undefined;
  }

  get isVersePara(): boolean {
    // If the user enters no markers except just \c and \v we want the text to be considered verse text. This is
    // covered by the empty stack that makes para_tag=None. Not specified text type is verse text
    const paraTag = this.paraTag;
    return (
      paraTag == null || paraTag.textType === UsfmTextType.VerseText || paraTag.textType === UsfmTextType.NotSpecified
    );
  }

  get isVerseText(): boolean {
    // Sidebars and notes are not verse text
    if (any(this._stack, (elem) => elem.type === UsfmElementType.Sidebar || elem.type === UsfmElementType.Note)) {
      return false;
    }

    if (!this.isVersePara) {
      return false;
    }

    // All character tags must be verse text
    for (const charTag of this.charTags) {
      // Not specified text type is verse text
      if (charTag.textType !== UsfmTextType.VerseText && charTag.textType !== 0) {
        return false;
      }
    }

    return true;
  }

  get isSpecialText(): boolean {
    return this.specialToken;
  }

  peek(): UsfmParserElement {
    return this._stack[this._stack.length - 1];
  }

  push(elem: UsfmParserElement): void {
    this._stack.push(elem);
  }

  pop(): UsfmParserElement {
    return this._stack.pop()!;
  }

  private *getCharTags(): IterableIterator<UsfmTag> {
    for (let i = this._stack.length - 1; i >= 0; i--) {
      const elem = this._stack[i];
      if (elem.type === UsfmElementType.Char && elem.marker != null) {
        yield this.stylesheet.getTag(elem.marker);
      }
    }
  }
}
