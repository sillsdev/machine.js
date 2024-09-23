import { last } from '../iterable-utils';
import { UsfmStylesheet } from './usfm-stylesheet';
import { UsfmStyleType, UsfmTextProperties } from './usfm-tag';
import { UsfmToken, UsfmTokenType } from './usfm-token';

export enum RtlReferenceOrder {
  NotSet,
  BookChapterVerse,
  BookVerseChapter,
}

const RTL_VERSE_REGEX = /[\u200E\u200F]*(\d+\w?)[\u200E\u200F]*([\p{P}\p{S}])[\u200E\u200F]*(?=\d)/u;

export class UsfmTokenizer {
  constructor(
    public readonly stylesheet: UsfmStylesheet,
    public readonly rtlReferenceOrder: RtlReferenceOrder = RtlReferenceOrder.NotSet,
  ) {}

  tokenize(usfm: string, preserveWhitespace = false, startLineNumber = 1, startColumnNumber = 1): readonly UsfmToken[] {
    const tokens: UsfmToken[] = [];

    let index = 0; // Current position
    let lineNum = startLineNumber; // Current line number
    let previousIndex = 0;
    while (index < usfm.length) {
      let nextMarkerIndex = index < usfm.length - 1 ? usfm.indexOf('\\', index + 1) : -1;
      if (nextMarkerIndex === -1) {
        nextMarkerIndex = usfm.length;
      }

      lineNum += countNewlines(usfm.substring(previousIndex, index));

      let colNum = index - usfm.lastIndexOf('\n', index);
      if (lineNum === startLineNumber) {
        colNum += startColumnNumber - 1;
      }
      previousIndex = index;

      // If text, create text token until end or next \
      const ch = usfm[index];
      if (ch != '\\') {
        let text = usfm.substring(index, nextMarkerIndex);
        if (!preserveWhitespace) {
          text = regularizeSpaces(text);
        }

        const [attributeToken, attrText] = this.handleAttributes(
          usfm,
          preserveWhitespace,
          tokens,
          nextMarkerIndex,
          text,
          lineNum,
          colNum,
        );
        text = attrText;

        if (text.length > 0) {
          tokens.push(new UsfmToken(UsfmTokenType.Text, undefined, text, undefined, undefined, lineNum, colNum));
        }

        if (attributeToken != null) {
          tokens.push(attributeToken);
        }

        index = nextMarkerIndex;
        continue;
      }

      // Get marker (and move past whitespace or star ending)
      index++;
      const markerStart = index;
      while (index < usfm.length) {
        const ch = usfm[index];

        // Backslash starts a new marker
        if (ch === '\\') {
          break;
        }

        // don't require a space before the | that starts attributes - mainly for milestones to allow
        // \qt-s|speaker\*
        if (ch === '|') {
          break;
        }

        // End star is part of marker
        if (ch === '*') {
          index++;
          break;
        }

        if (isNonsemanticWhitespace(ch)) {
          // Preserve whitespace if needed, otherwise skip
          if (!preserveWhitespace) {
            index++;
          }
          break;
        }
        index++;
      }

      const marker = usfm.substring(markerStart, index).trimEnd();
      // Milestone stop/end markers are ended with \*, so marker will just be * and can be skipped
      if (marker === '*') {
        // make sure that previous token was a milestone - have to skip space only tokens that may have been
        // added when preserve_whitespace is true.
        let prevToken: UsfmToken | undefined = undefined;
        if (tokens.length > 0) {
          prevToken = last(tokens, (t) => t.type !== UsfmTokenType.Text || t.text?.trim() !== '');
        }
        if (
          prevToken != null &&
          (prevToken.type === UsfmTokenType.Milestone || prevToken.type === UsfmTokenType.MilestoneEnd)
        ) {
          // if the last item is an empty text token, remove it so we don't get extra space.
          if (tokens[tokens.length - 1].type === UsfmTokenType.Text) {
            tokens.pop();
          }
          continue;
        }
      }

      // Multiple whitespace after non-end marker is ok
      if (!marker.endsWith('*') && !preserveWhitespace) {
        while (index < usfm.length && isNonsemanticWhitespace(usfm[index])) {
          index++;
        }
      }

      // Lookup marker
      let tag = this.stylesheet.getTag(marker.startsWith('+') ? marker.substring(1) : marker);

      // If starts with a plus and is not a character style or an end style, it is an unknown tag
      if (marker.startsWith('+') && tag.styleType !== UsfmStyleType.Character && tag.styleType !== UsfmStyleType.End) {
        tag = this.stylesheet.getTag(marker);
      }

      const endMarker = tag.styleType !== UsfmStyleType.Milestone ? marker + '*' : tag.endMarker;

      switch (tag.styleType) {
        case UsfmStyleType.Character:
          if ((tag.textProperties & UsfmTextProperties.Verse) == UsfmTextProperties.Verse) {
            const [nextIndex, data] = getNextWord(usfm, index, preserveWhitespace);
            index = nextIndex;
            tokens.push(new UsfmToken(UsfmTokenType.Verse, marker, undefined, undefined, data, lineNum, colNum));
          } else {
            tokens.push(
              new UsfmToken(UsfmTokenType.Character, marker, undefined, endMarker, undefined, lineNum, colNum),
            );
          }
          break;

        case UsfmStyleType.Paragraph:
          // Handle verse special case
          if ((tag.textProperties & UsfmTextProperties.Chapter) == UsfmTextProperties.Chapter) {
            const [nextIndex, data] = getNextWord(usfm, index, preserveWhitespace);
            index = nextIndex;
            tokens.push(new UsfmToken(UsfmTokenType.Chapter, marker, undefined, undefined, data, lineNum, colNum));
          } else if ((tag.textProperties & UsfmTextProperties.Book) == UsfmTextProperties.Book) {
            const [nextIndex, data] = getNextWord(usfm, index, preserveWhitespace);
            index = nextIndex;
            tokens.push(new UsfmToken(UsfmTokenType.Book, marker, undefined, undefined, data, lineNum, colNum));
          } else {
            tokens.push(
              new UsfmToken(UsfmTokenType.Paragraph, marker, undefined, endMarker, undefined, lineNum, colNum),
            );
          }
          break;

        case UsfmStyleType.Note: {
          const [nextIndex, data] = getNextWord(usfm, index, preserveWhitespace);
          index = nextIndex;
          tokens.push(new UsfmToken(UsfmTokenType.Note, marker, undefined, endMarker, data, lineNum, colNum));
          break;
        }

        case UsfmStyleType.End:
          tokens.push(new UsfmToken(UsfmTokenType.End, marker, undefined, undefined, undefined, lineNum, colNum));
          break;

        case UsfmStyleType.Unknown:
          // End tokens are always end tokens, even if unknown
          if (marker.endsWith('*')) {
            tokens.push(new UsfmToken(UsfmTokenType.End, marker, undefined, undefined, undefined, lineNum, colNum));
          } else if (marker === 'esb' || marker === 'esbe') {
            // Handle special case of esb and esbe which might not be in basic stylesheet but are always sidebars
            // and so should be tokenized as paragraphs
            tokens.push(
              new UsfmToken(UsfmTokenType.Paragraph, marker, undefined, endMarker, undefined, lineNum, colNum),
            );
          } else {
            // Create unknown token with a corresponding end note
            tokens.push(
              new UsfmToken(UsfmTokenType.Unknown, marker, undefined, marker + '*', undefined, lineNum, colNum),
            );
          }
          break;

        case UsfmStyleType.Milestone:
        case UsfmStyleType.MilestoneEnd:
          // if a milestone is not followed by a ending \* treat don't create a milestone token for the begining.
          // Instead create at text token for all the text up to the beginning of the next marker. This will make
          // typing of milestones easiest since the partially typed milestone more be reformatted to have a normal
          // ending even if it hasn't been typed yet.
          if (!milestoneEnded(usfm, index)) {
            let endOfText = index < usfm.length - 1 ? usfm.indexOf('\\', index) : -1;
            if (endOfText === -1) {
              endOfText = usfm.length;
            }
            let milestoneText = usfm.substring(index, endOfText);
            // add back space that was removed after marker
            if (milestoneText.length > 0 && !milestoneText.startsWith(' ') && !milestoneText.startsWith('|')) {
              milestoneText = ' ' + milestoneText;
            }
            tokens.push(
              new UsfmToken(
                UsfmTokenType.Text,
                undefined,
                '\\' + marker + milestoneText,
                undefined,
                undefined,
                lineNum,
                colNum,
              ),
            );
            index = endOfText;
          } else if (tag.styleType === UsfmStyleType.Milestone) {
            tokens.push(
              new UsfmToken(UsfmTokenType.Milestone, marker, undefined, endMarker, undefined, lineNum, colNum),
            );
          } else {
            tokens.push(
              new UsfmToken(UsfmTokenType.MilestoneEnd, marker, undefined, undefined, undefined, lineNum, colNum),
            );
          }
          break;
      }
    }

    // Forces a space to be present in tokenization if immediately
    // before a token requiring a preceding CR/LF. This is to ensure
    // that when written to disk and re-read, that tokenization
    // will match. For example, "\p test\p here" requires a space
    // after "test". Also, "\p \em test\em*\p here" requires a space
    // token inserted after \em*
    if (!preserveWhitespace) {
      for (let i = 1; i < tokens.length; i++) {
        // If requires newline (verses do, except when after '(' or '[')
        if (
          tokens[i].type === UsfmTokenType.Book ||
          tokens[i].type === UsfmTokenType.Chapter ||
          tokens[i].type === UsfmTokenType.Paragraph ||
          (tokens[i].type === UsfmTokenType.Verse &&
            !(
              tokens[i - 1].type === UsfmTokenType.Text &&
              (tokens[i - 1].text?.endsWith('(') || tokens[i - 1].text?.endsWith('['))
            ))
        ) {
          // Add space to text token
          if (tokens[i - 1].type === UsfmTokenType.Text) {
            if (!tokens[i - 1].text?.endsWith(' ')) {
              tokens[i - 1].text! += ' ';
            }
          } else if (tokens[i - 1].type === UsfmTokenType.End) {
            // Insert space token after * of end marker
            let colNum: number;
            if (index >= usfm.length) {
              colNum = usfm.length + 1;
            } else {
              colNum = usfm.length + 1 - Math.max(usfm.lastIndexOf('\n', index), 0);
            }

            tokens.splice(
              i,
              0,
              new UsfmToken(UsfmTokenType.Text, undefined, ' ', undefined, undefined, lineNum, colNum),
            );
            i++;
          }
        }
      }
    }

    return tokens;
  }

  detokenize(tokens: Iterable<UsfmToken>, tokensHaveWhitespace = false): string {
    let prevToken: UsfmToken | undefined = undefined;
    let usfm = '';
    let inBook = false;
    for (const token of tokens) {
      let tokenUsfm = '';
      switch (token.type) {
        case UsfmTokenType.Book:
        case UsfmTokenType.Chapter:
        case UsfmTokenType.Paragraph:
          // Strip space from end of string before CR/LF
          if (usfm.length > 0) {
            if (
              (usfm.endsWith(' ') && prevToken != null && prevToken.toUsfm().trim() !== '') ||
              !tokensHaveWhitespace
            ) {
              usfm = usfm.substring(0, usfm.length - 1);
            }
            if (!tokensHaveWhitespace) {
              usfm += '\r\n';
            }
          }
          tokenUsfm = token.toUsfm();
          inBook = token.type === UsfmTokenType.Book;
          break;

        case UsfmTokenType.Verse:
          // Add newline if after anything other than [ or (
          if (usfm.length > 0 && !usfm.endsWith('[') && !usfm.endsWith('(')) {
            if (
              (usfm.endsWith(' ') && prevToken != null && prevToken.toUsfm().trim() !== '') ||
              !tokensHaveWhitespace
            ) {
              usfm = usfm.substring(0, usfm.length - 1);
            }
            if (!tokensHaveWhitespace) {
              usfm += '\r\n';
            }
          }

          tokenUsfm = tokensHaveWhitespace ? token.toUsfm().trim() : token.toUsfm();

          // want RTL mark around all punctuation in verses
          if (this.rtlReferenceOrder !== RtlReferenceOrder.NotSet) {
            const directionMarker = this.rtlReferenceOrder === RtlReferenceOrder.BookVerseChapter ? '\u200f' : '\u200e';
            tokenUsfm = tokenUsfm.replace(RTL_VERSE_REGEX, `$1${directionMarker}$2`);
          }
          inBook = false;
          break;
        case UsfmTokenType.Text:
          // Ensure spaces are preserved
          tokenUsfm = token.toUsfm();
          if (tokensHaveWhitespace && usfm.length > 0 && usfm.endsWith(' ')) {
            if (
              (tokenUsfm.length > 0 &&
                tokenUsfm.startsWith(' ') &&
                prevToken != null &&
                prevToken.toUsfm().trim() !== '') ||
              tokenUsfm.startsWith('\r\n')
            ) {
              usfm = usfm.substring(0, usfm.length - 1);
            } else {
              tokenUsfm = tokenUsfm.trimStart();
            }
          }
          break;

        default:
          if (inBook) {
            if (
              usfm.endsWith(' ') &&
              ((prevToken != null && prevToken.toUsfm().trim() !== '') || !tokensHaveWhitespace)
            ) {
              usfm = usfm.substring(0, usfm.length - 1);
            }
            if (!tokensHaveWhitespace) {
              usfm += '\r\n';
            }
          }
          tokenUsfm = token.toUsfm();
          inBook = false;
          break;
      }
      usfm += tokenUsfm;
      prevToken = token;
    }

    // Make sure begins without space or CR/LF
    if (usfm.length > 0 && usfm.startsWith(' ')) {
      usfm = usfm.substring(1);
    }
    if (usfm.length > 0 && usfm.startsWith('\r')) {
      usfm = usfm.substring(2);
    }

    // Make sure ends without space and with a CR/LF
    if (usfm.length > 0 && usfm.endsWith(' ')) {
      usfm = usfm.substring(0, usfm.length - 1);
    }
    if (usfm.length > 0 && !usfm.endsWith('\n')) {
      usfm += '\r\n';
    }
    if (usfm.length > 0 && usfm.endsWith(' \r\n')) {
      usfm = usfm.substring(0, usfm.length - 3) + usfm.substring(usfm.length - 2);
    }
    return usfm;
  }

  private handleAttributes(
    usfm: string,
    preserveWhitespace: boolean,
    tokens: UsfmToken[],
    nextMarkerIndex: number,
    text: string,
    lineNumber: number,
    columnNumber: number,
  ): [UsfmToken | undefined, string] {
    const attributeIndex = text.indexOf('|');
    if (attributeIndex < 0) {
      return [undefined, text];
    }

    const matchingToken = findMatchingStartMarker(usfm, tokens, nextMarkerIndex);
    if (matchingToken?.marker == null) {
      return [undefined, text];
    }

    const matchingTag = this.stylesheet.getTag(matchingToken.nestlessMarker!);
    if (
      matchingTag.styleType !== UsfmStyleType.Character &&
      matchingTag.styleType !== UsfmStyleType.Milestone &&
      matchingTag.styleType !== UsfmStyleType.MilestoneEnd
    ) {
      return [undefined, text]; // leave attributes of other styles as regular text
    }

    let attributeToken: UsfmToken | undefined = undefined;
    const attributesValue = text.substring(attributeIndex + 1);
    const adjustedText = matchingToken.setAttributes(
      attributesValue,
      matchingTag.defaultAttributeName,
      text.substring(0, attributeIndex),
      preserveWhitespace,
    );
    if (adjustedText != null) {
      text = adjustedText;

      if (matchingTag.styleType === UsfmStyleType.Character) {
        // Don't do this for milestones
        attributeToken = new UsfmToken(
          UsfmTokenType.Attribute,
          matchingTag.marker,
          undefined,
          undefined,
          attributesValue,
          lineNumber,
          columnNumber + attributeIndex,
        );
        attributeToken.copyAttributes(matchingToken);
      }
    }
    return [attributeToken, text];
  }
}

const ZERO_WIDTH_SPACE = '\u200B';

function countNewlines(text: string): number {
  return text.split('\n').length - 1;
}

function getNextWord(usfm: string, index: number, preserveWhitespace: boolean): [number, string] {
  // Skip over leading spaces
  while (index < usfm.length && isNonsemanticWhitespace(usfm[index])) {
    index++;
  }

  const dataStart = index;
  while (index < usfm.length && !isNonsemanticWhitespace(usfm[index]) && usfm[index] !== '\\') {
    index++;
  }

  const data = usfm.substring(dataStart, index);

  // Skip over trailing spaces
  if (!preserveWhitespace) {
    while (index < usfm.length && isNonsemanticWhitespace(usfm[index])) {
      index++;
    }
  }

  return [index, data];
}

function isNonsemanticWhitespace(c: string): boolean {
  // Checks if is whitespace, but not U+3000 (IDEOGRAPHIC SPACE).
  return (c !== '\u3000' && c.trim() === '') || c === ZERO_WIDTH_SPACE;
}

function regularizeSpaces(str: string): string {
  let wasSpace = false;
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    // Control characters and CR/LF and TAB become spaces
    if (ch.charCodeAt(0) < 32) {
      if (!wasSpace) {
        result += ' ';
      }
      wasSpace = true;
    } else if (!wasSpace && ch === ZERO_WIDTH_SPACE && i + 1 < str.length && isNonsemanticWhitespace(str[i + 1])) {
      // ZWSP is redundant if followed by a space
    } else if (isNonsemanticWhitespace(ch)) {
      // Keep other kinds of spaces
      if (!wasSpace) {
        result += ch;
      }
      wasSpace = true;
    } else {
      result += ch;
      wasSpace = false;
    }
  }
  return result;
}

function findMatchingStartMarker(usfm: string, tokens: UsfmToken[], nextMarkerIndex: number): UsfmToken | undefined {
  const expectedStartMarker = beforeEndMarker(usfm, nextMarkerIndex);
  if (expectedStartMarker == null) {
    return undefined;
  }

  if (
    expectedStartMarker === '' &&
    (tokens[tokens.length - 1].type === UsfmTokenType.Milestone ||
      tokens[tokens.length - 1].type === UsfmTokenType.MilestoneEnd)
  ) {
    return tokens[tokens.length - 1];
  }

  let nestingLevel = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.type === UsfmTokenType.End) {
      nestingLevel++;
    } else if (token.type !== UsfmTokenType.Text && token.type !== UsfmTokenType.Attribute) {
      if (nestingLevel > 0) {
        nestingLevel--;
      } else if (nestingLevel === 0) {
        return token;
      }
    }
  }

  return undefined;
}

function beforeEndMarker(usfm: string, nextMarkerIndex: number): string | undefined {
  let index = nextMarkerIndex + 1;
  while (index < usfm.length && usfm[index] !== '*' && usfm[index].trim() !== '') {
    index++;
  }

  if (index >= usfm.length || usfm[index] !== '*') {
    return undefined;
  }
  return usfm.substring(nextMarkerIndex + 1, index);
}

function milestoneEnded(usfm: string, index: number): boolean {
  const nextMarkerIndex = index < usfm.length ? usfm.indexOf('\\', index) : -1;
  if (nextMarkerIndex === -1 || nextMarkerIndex > usfm.length - 2) {
    return false;
  }
  return usfm.substring(nextMarkerIndex, nextMarkerIndex + 2) === '\\*';
}
