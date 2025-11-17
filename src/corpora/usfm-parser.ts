import { Canon, ScrVers } from '@sillsdev/scripture';

import { all, any } from '../iterable-utils';
import { UsfmParserHandler } from './usfm-parser-handler';
import { UsfmElementType, UsfmParserElement, UsfmParserState } from './usfm-parser-state';
import { createUsfmStylesheet, isCellRange, UsfmStylesheet } from './usfm-stylesheet';
import { UsfmTextType } from './usfm-tag';
import { UsfmToken, UsfmTokenType } from './usfm-token';
import { UsfmTokenizer } from './usfm-tokenizer';

const OPT_BREAK_SPLITTER = /(\/\/)/;

export async function parseUsfm(
  usfm: string,
  handler: UsfmParserHandler,
  stylesheet: string | UsfmStylesheet = 'usfm.sty',
  versification?: ScrVers,
  preserveWhitespace = false,
): Promise<void> {
  if (typeof stylesheet === 'string') {
    stylesheet = await createUsfmStylesheet(stylesheet);
  }
  const parser = new UsfmParser(usfm, handler, stylesheet, versification, preserveWhitespace);
  parser.processTokens();
}

export class UsfmParser {
  public readonly tokens: readonly UsfmToken[];
  public readonly state: UsfmParserState;
  public readonly stylesheet: UsfmStylesheet;

  constructor(
    usfm: string | readonly UsfmToken[],
    public readonly handler?: UsfmParserHandler,
    stylesheet: string | UsfmStylesheet = 'usfm.sty',
    versification?: ScrVers,
    public readonly tokensPreserveWhitespace = false,
  ) {
    if (typeof stylesheet === 'string') {
      this.stylesheet = new UsfmStylesheet(stylesheet);
    } else {
      this.stylesheet = stylesheet;
    }
    if (typeof usfm === 'string') {
      const tokenizer = new UsfmTokenizer(this.stylesheet);
      this.tokens = tokenizer.tokenize(usfm, tokensPreserveWhitespace);
    } else {
      this.tokens = usfm;
    }
    versification ??= ScrVers.English;
    this.state = new UsfmParserState(this.stylesheet, versification, this.tokens);
  }

  processTokens(): void {
    while (this.processToken()) {
      // do nothing
    }
  }

  processToken(): boolean {
    // If past end
    if (this.state.index >= this.state.tokens.length - 1) {
      this.closeAll();
      this.handler?.endUsfm(this.state);
      return false;
    } else if (this.state.index < 0) {
      this.handler?.startUsfm(this.state);
    }

    // Move to next token
    this.state.index++;

    if (this.state.token == null) {
      // this should never happen
      throw new Error('There is no current token.');
    }

    this.state.lineNumber = this.state.token.lineNumber;
    this.state.columnNumber = this.state.token.columnNumber;

    // Update verse offset with previous token (since verse offset is from start of current token)
    if (this.state.prevToken != null) {
      this.state.verseOffset += this.state.prevToken.getLength(false, !this.tokensPreserveWhitespace);
    }

    // Skip over tokens that are to be skipped, ensuring that special_token state is True.
    if (this.state.specialTokenCount > 0) {
      this.state.specialTokenCount--;
      this.state.specialToken = true;
      return true;
    }

    // Reset special token and figure status
    this.state.specialToken = false;

    const token = this.state.token;

    // Switch unknown types to either character or paragraph
    let tokenType = token.type;
    if (tokenType === UsfmTokenType.Unknown) {
      tokenType = this.determineUnknownTokenType();
    }

    if (this.handler != null && token.marker != null && token.marker.length > 0) {
      this.handler.gotMarker(this.state, token.marker);
    }

    switch (tokenType) {
      case UsfmTokenType.Book:
      case UsfmTokenType.Chapter:
        this.closeAll();
        break;

      case UsfmTokenType.Paragraph:
        if (token.marker === 'tr') {
          // Handle special case of table rows
          while (
            this.state.stack.length > 0 &&
            this.state.peek().type !== UsfmElementType.Table &&
            this.state.peek().type !== UsfmElementType.Sidebar
          ) {
            this.closeElement();
          }
        } else if (token.marker === 'esb') {
          // Handle special case of sidebars
          this.closeAll();
        } else {
          // Close all but sidebar
          while (this.state.stack.length > 0 && this.state.peek().type !== UsfmElementType.Sidebar) {
            this.closeElement();
          }
        }
        break;

      case UsfmTokenType.Character:
        if (this.isCell(token)) {
          // Handle special case of table cell
          // Close until row
          while (this.state.peek().type !== UsfmElementType.Row) {
            this.closeElement();
          }
        } else if (this.isRef(token)) {
          // Handle refs
          // Refs don't close anything
        } else if (token.marker != null && !token.marker.startsWith('+')) {
          // If non-nested character style, close all character styles
          this.closeCharStyles();
        }
        break;

      case UsfmTokenType.Verse: {
        const paraTag = this.state.paraTag;
        if (paraTag != null && paraTag.textType !== UsfmTextType.VerseText && paraTag.textType !== 0) {
          this.closeAll();
        } else {
          this.closeNote();
        }
        break;
      }

      case UsfmTokenType.Note:
        this.closeNote();
        break;

      case UsfmTokenType.End:
        // If end marker for an active note
        if (
          any(
            this.state.stack,
            (elem) => elem.type === UsfmElementType.Note && elem.marker != null && elem.marker + '*' === token.marker,
          )
        ) {
          this.closeNote(true);
        } else {
          // If end marker for a character style on stack, close it
          // If no matching end marker, close all character styles on top of stack
          let unmatched = true;
          while (this.state.stack.length > 0) {
            const elem = this.state.peek();
            if (elem.type !== UsfmElementType.Char) {
              break;
            }

            // Determine if a + prefix is needed to close it (was nested char style)
            const plusPrefix =
              this.state.stack.length > 1 &&
              this.state.stack[this.state.stack.length - 2].type === UsfmElementType.Char;

            if ((plusPrefix ? '+' : '') + elem.marker! + '*' === token.marker) {
              this.closeElement(true);
              unmatched = false;
              break;
            } else {
              this.closeElement();
            }
          }

          // Unmatched end marker
          if (unmatched) {
            this.handler?.unmatched(this.state, token.marker!);
          }
        }
        break;
    }

    // Handle tokens
    switch (tokenType) {
      case UsfmTokenType.Book: {
        this.state.push(new UsfmParserElement(UsfmElementType.Book, token.marker));

        // Code is always upper case
        const code = token.data!.toUpperCase();

        // Update verse ref. Leave book alone if not empty to prevent parsing errors on books with bad id lines.
        const verseRef = this.state.verseRef;
        if (verseRef.book === '' && Canon.bookIdToNumber(code) !== 0) {
          verseRef.book = code;
        }
        verseRef.chapter = '1';
        verseRef.verseNum = 0;
        this.state.verseOffset = 0;

        // Book start.
        this.handler?.startBook(this.state, token.marker!, code);
        break;
      }

      case UsfmTokenType.Chapter: {
        let altChapter: string | undefined = undefined;
        if (this.state.index < this.state.tokens.length - 3) {
          const altChapterToken = this.state.tokens[this.state.index + 1];
          const altChapterNumToken = this.state.tokens[this.state.index + 2];
          const altChapterEndToken = this.state.tokens[this.state.index + 3];
          if (
            altChapterToken.marker === 'ca' &&
            altChapterNumToken.text != null &&
            altChapterEndToken.marker === 'ca*'
          ) {
            altChapter = altChapterNumToken.text.trim();
            this.state.specialTokenCount += 3;

            // Skip blank space after if present
            if (this.state.index + this.state.specialTokenCount < this.state.tokens.length - 1) {
              const blankToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 1];
              if (blankToken.text != null && blankToken.text.trim() === '') {
                this.state.specialTokenCount++;
              }
            }
          }
        }

        // Get publishable chapter number
        let pubChapter: string | undefined = undefined;
        if (this.state.index + this.state.specialTokenCount < this.state.tokens.length - 2) {
          const pubChapterToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 1];
          const pubChapterNumToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 2];
          if (pubChapterToken.marker === 'cp' && pubChapterNumToken.text != null) {
            pubChapter = pubChapterNumToken.text.trim();
            this.state.specialTokenCount += 2;
          }
        }

        const verseRef = this.state.verseRef;
        verseRef.chapter = token.data!;
        verseRef.verseNum = 0;
        // Verse offset is not zeroed for chapter 1, as it is part of intro
        if (verseRef.chapterNum !== 1) {
          this.state.verseOffset = 0;
        }
        this.handler?.chapter(this.state, token.data!, token.marker!, altChapter, pubChapter);
        break;
      }

      case UsfmTokenType.Verse: {
        // Get alternate verse number
        let altVerse: string | undefined = undefined;
        if (this.state.index < this.state.tokens.length - 3) {
          const altVerseToken = this.state.tokens[this.state.index + 1];
          const altVerseNumToken = this.state.tokens[this.state.index + 2];
          const altVerseEndToken = this.state.tokens[this.state.index + 3];
          if (altVerseToken.marker == 'va' && altVerseNumToken.text != null && altVerseEndToken.marker === 'va*') {
            altVerse = altVerseNumToken.text.trim();
            this.state.specialTokenCount += 3;
          }
        }

        // Get publishable verse number
        let pubVerse: string | undefined = undefined;
        if (this.state.index + this.state.specialTokenCount < this.state.tokens.length - 3) {
          const pubVerseToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 1];
          const pubVerseNumToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 2];
          const pubVerseEndToken = this.state.tokens[this.state.index + this.state.specialTokenCount + 3];
          if (pubVerseToken.marker === 'vp' && pubVerseNumToken.text != null && pubVerseEndToken.marker === 'vp*') {
            pubVerse = pubVerseNumToken.text.trim();
            this.state.specialTokenCount += 3;
          }
        }

        const verseRef = this.state.verseRef;
        verseRef.verse = token.data!;
        this.state.verseOffset = 0;

        this.handler?.verse(this.state, token.data!, token.marker!, altVerse, pubVerse);
        break;
      }

      case UsfmTokenType.Paragraph: {
        if (token.marker == 'tr') {
          // Handle special case of table rows
          // Start table if not open
          if (all(this.state.stack, (elem) => elem.type !== UsfmElementType.Table)) {
            this.state.push(new UsfmParserElement(UsfmElementType.Table));
            this.handler?.startTable(this.state);
          }

          this.state.push(new UsfmParserElement(UsfmElementType.Row, token.marker));

          // Row start
          this.handler?.startRow(this.state, token.marker);
        } else if (token.marker == 'esb') {
          // Handle special case of sidebars
          this.state.push(new UsfmParserElement(UsfmElementType.Sidebar, token.marker));

          // Look for category
          let category: string | undefined = undefined;
          if (this.state.index < this.state.tokens.length - 3) {
            const categoryToken = this.state.tokens[this.state.index + 1];
            const categoryValueToken = this.state.tokens[this.state.index + 2];
            const categoryEndToken = this.state.tokens[this.state.index + 3];
            if (
              categoryToken.marker === 'esbc' &&
              categoryValueToken.text != null &&
              categoryEndToken.marker === 'esbc*'
            ) {
              category = categoryValueToken.text.trim();
              this.state.specialTokenCount += 3;
            }
          }

          // Sidebar start
          this.handler?.startSidebar(this.state, token.marker, category);
        } else if (token.marker == 'esbe') {
          // Close sidebar if in sidebar
          if (any(this.state.stack, (elem) => elem.type === UsfmElementType.Sidebar)) {
            while (this.state.stack.length > 0) {
              this.closeElement(this.state.peek().type === UsfmElementType.Sidebar);
            }
          } else {
            this.handler?.unmatched(this.state, token.marker);
          }
        } else {
          this.state.push(new UsfmParserElement(UsfmElementType.Para, token.marker));

          // Paragraph start
          this.handler?.startPara(this.state, token.marker!, token.type === UsfmTokenType.Unknown, token.attributes);
        }
        break;
      }

      case UsfmTokenType.Character: {
        if (this.isCell(token)) {
          // Handle special case of table cells (treated as special character style)
          let align = 'start';
          if (token.marker!.length > 2 && token.marker![2] === 'c') {
            align = 'center';
          } else if (token.marker!.length > 2 && token.marker![2] === 'r') {
            align = 'end';
          }

          const [_, baseMarker, colSpan] = isCellRange(token.marker!);
          this.state.push(new UsfmParserElement(UsfmElementType.Cell, baseMarker));

          this.handler?.startCell(this.state, baseMarker, align, colSpan);
        } else if (this.isRef(token)) {
          // xrefs are special tokens (they do not stand alone)
          this.state.specialToken = true;

          const [display, target] = this.parseDisplayAndTarget();

          this.state.specialTokenCount += 2;

          this.handler?.ref(this.state, token.marker!, display, target);
        } else {
          let invalidMarker = false;
          let actualMarker: string;
          if (token.marker?.startsWith('+')) {
            // Only strip + if properly nested
            const charTag = this.state.charTag;
            actualMarker = charTag != null ? token.marker.substring(1) : token.marker;
            invalidMarker = charTag == null;
          } else {
            actualMarker = token.marker!;
          }

          this.state.push(new UsfmParserElement(UsfmElementType.Char, actualMarker, token.attributes));
          this.handler?.startChar(
            this.state,
            actualMarker,
            token.type === UsfmTokenType.Unknown || invalidMarker,
            token.attributes,
          );
        }
        break;
      }

      case UsfmTokenType.Note: {
        // Look for category
        let category: string | undefined = undefined;
        if (this.state.index < this.state.tokens.length - 3) {
          const categoryToken = this.state.tokens[this.state.index + 1];
          const categoryValueToken = this.state.tokens[this.state.index + 2];
          const categoryEndToken = this.state.tokens[this.state.index + 3];
          if (categoryToken.marker === 'cat' && categoryValueToken.text != null && categoryEndToken.marker === 'cat*') {
            category = categoryValueToken.text.trim();
            this.state.specialTokenCount += 3;
          }
        }

        this.state.push(new UsfmParserElement(UsfmElementType.Note, token.marker));

        this.handler?.startNote(this.state, token.marker!, token.data!, category);
        break;
      }

      case UsfmTokenType.Text: {
        let text = token.text!;
        // If last token before a paragraph, book or chapter, esb, esbe (both are paragraph types),
        // or at very end, strip final space
        // This is because USFM requires these to be on a new line, therefore adding whitespace
        if (
          (this.state.index === this.state.tokens.length - 1 ||
            this.state.tokens[this.state.index + 1].type === UsfmTokenType.Paragraph ||
            this.state.tokens[this.state.index + 1].type === UsfmTokenType.Book ||
            this.state.tokens[this.state.index + 1].type === UsfmTokenType.Chapter) &&
          text.length > 0 &&
          text.endsWith(' ')
        ) {
          text = text.substring(0, text.length - 1);
        }

        if (this.handler != null) {
          // Replace ~ with nbsp
          text = text.replace('~', '\u00A0');

          // Replace // with <optbreak/>
          for (const part of text.split(OPT_BREAK_SPLITTER)) {
            if (part === '//') {
              this.handler.optBreak(this.state);
            } else {
              this.handler.text(this.state, part);
            }
            this.state.columnNumber += part.length;
          }
        }
        break;
      }

      case UsfmTokenType.Milestone:
      case UsfmTokenType.MilestoneEnd:
        // currently, parse state doesn't need to be update, so just inform the handler about the milestone.
        this.handler?.milestone(this.state, token.marker!, token.type == UsfmTokenType.Milestone, token.attributes);
        break;
    }
    return true;
  }

  private parseDisplayAndTarget(): [string, string] {
    const nextToken = this.state.tokens[this.state.index + 1];
    const index = nextToken.text!.indexOf('|');
    const display = nextToken.text!.substring(0, index);
    const target = nextToken.text!.substring(index + 1);
    return [display, target];
  }

  private closeAll(): void {
    while (this.state.stack.length > 0) {
      this.closeElement();
    }
  }

  private determineUnknownTokenType(): UsfmTokenType {
    if (any(this.state.stack, (elem) => elem.type === UsfmElementType.Note)) {
      return UsfmTokenType.Character;
    }
    return UsfmTokenType.Paragraph;
  }

  private closeNote(closed = false): void {
    if (any(this.state.stack, (elem) => elem.type === UsfmElementType.Note)) {
      let elem: UsfmParserElement | undefined = undefined;
      while (this.state.stack.length > 0 && (elem == null || elem.type !== UsfmElementType.Note)) {
        elem = this.state.peek();
        this.closeElement(closed && elem.type === UsfmElementType.Note);
      }
    }
  }

  private closeCharStyles(): void {
    while (this.state.stack.length > 0 && this.state.peek().type === UsfmElementType.Char) {
      this.closeElement();
    }
  }

  private closeElement(closed = false): void {
    const element = this.state.pop();
    switch (element.type) {
      case UsfmElementType.Book:
        this.handler?.endBook(this.state, element.marker!);
        break;

      case UsfmElementType.Para:
        this.handler?.endPara(this.state, element.marker!);
        break;

      case UsfmElementType.Char:
        this.handler?.endChar(this.state, element.marker!, element.attributes, closed);
        break;

      case UsfmElementType.Note:
        this.handler?.endNote(this.state, element.marker!, closed);
        break;

      case UsfmElementType.Table:
        this.handler?.endTable(this.state);
        break;

      case UsfmElementType.Row:
        this.handler?.endRow(this.state, element.marker!);
        break;

      case UsfmElementType.Cell:
        this.handler?.endCell(this.state, element.marker!);
        break;

      case UsfmElementType.Sidebar:
        this.handler?.endSidebar(this.state, element.marker!, closed);
        break;
    }
  }

  private isCell(token: UsfmToken): boolean {
    return (
      token.type === UsfmTokenType.Character &&
      token.marker != null &&
      (token.marker.startsWith('th') || token.marker.startsWith('tc')) &&
      any(this.state.stack, (elem) => elem.type === UsfmElementType.Row)
    );
  }

  private isRef(token: UsfmToken): boolean {
    if (token.marker !== 'ref') {
      return false;
    }

    if (this.state.index >= this.state.tokens.length - 2) {
      return false;
    }

    const attrToken = this.state.tokens[this.state.index + 1];
    if (!attrToken.text?.includes('|')) {
      return false;
    }

    const endToken = this.state.tokens[this.state.index + 2];
    return endToken.type === UsfmTokenType.End && endToken.marker === token.endMarker;
  }
}
