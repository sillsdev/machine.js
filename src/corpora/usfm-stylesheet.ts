import { existsSync, readFileSync } from 'fs';
import { access, readFile } from 'fs/promises';
import { basename, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  UsfmJustification,
  UsfmStyleAttribute,
  UsfmStyleType,
  UsfmTag,
  UsfmTextProperties,
  UsfmTextType,
} from './usfm-tag';

const DIRNAME = dirname(fileURLToPath(import.meta.url));
const CELL_RANGE_REGEX = /^(t[ch][cr]?[1-5])-([2-5])$/;

export async function createUsfmStylesheet(
  stylesheetFileName = 'usfm.sty',
  alternateStylesheetFileName?: string,
): Promise<UsfmStylesheet> {
  const stylesheet = new UsfmStylesheet();
  await stylesheet.loadFromFile(stylesheetFileName, alternateStylesheetFileName);
  return stylesheet;
}

export function isCellRange(marker: string): [boolean, string, number] {
  const match = CELL_RANGE_REGEX.exec(marker);
  if (match != null) {
    const baseTag = match[1];
    const colSpan = match[2].charCodeAt(0) - baseTag.charCodeAt(baseTag.length - 1) + 1;
    if (colSpan >= 2) {
      return [true, baseTag, colSpan];
    }
  }
  return [false, marker, 0];
}

export class UsfmStylesheet {
  private readonly tags = new Map<string, UsfmTag>();

  constructor(stylesheetFileName?: string, alternateStylesheetFileName?: string) {
    if (stylesheetFileName != null) {
      this.parseSync(stylesheetFileName);
      if (alternateStylesheetFileName != null) {
        this.parseSync(alternateStylesheetFileName);
      }
    }
  }

  async loadFromFile(stylesheetFileName: string, alternateStylesheetFileName?: string): Promise<void> {
    await this.parse(stylesheetFileName);
    if (alternateStylesheetFileName != null) {
      await this.parse(alternateStylesheetFileName);
    }
  }

  getTag(marker: string): UsfmTag {
    let tag = this.tags.get(marker);
    if (tag != null) return tag;

    const [isCell, baseTag, _] = isCellRange(marker);
    if (isCell) {
      tag = this.tags.get(baseTag);
      if (tag != null) return tag;
    }

    tag = this.createTag(marker);
    tag.styleType = UsfmStyleType.Unknown;
    return tag;
  }

  private async parse(fileName: string): Promise<void> {
    try {
      await access(fileName);
    } catch {
      const name = basename(fileName);
      if (name === 'usfm.sty' || name === 'usfm_sb.sty') {
        fileName = resolve(DIRNAME, name);
      } else {
        throw new Error(`The stylesheet does not exist.`);
      }
    }

    this.parseTagEntries(await readFile(fileName, 'utf8'));
  }

  private parseSync(fileName: string): void {
    if (!existsSync(fileName)) {
      const name = basename(fileName);
      if (name === 'usfm.sty' || name === 'usfm_sb.sty') {
        fileName = resolve(DIRNAME, name);
      } else {
        throw new Error(`The stylesheet does not exist.`);
      }
    }

    this.parseTagEntries(readFileSync(fileName, 'utf8'));
  }

  private parseTagEntries(contents: string): void {
    const entries = splitStylesheet(contents);
    for (let i = 0; i < entries.length; i++) {
      const [entryMarker, entryText] = entries[i];

      if (entryMarker !== 'marker') {
        continue;
      }

      const parts = entryText.split(' ');
      if (parts.length > 1 && parts[1] === '-') {
        // If the entry looks like "\marker xy -" remove the tag and its end tag if any
        this.tags.delete(parts[0]);
        this.tags.delete(`${parts[0]}*`);
      }

      const tag = this.createTag(entryText);
      const endTag = parseTagEntry(tag, entries, i + 1);

      if (endTag != null && !this.tags.has(endTag.marker)) {
        this.tags.set(endTag.marker, endTag);
      }
    }
  }

  private createTag(marker: string): UsfmTag {
    // If tag already exists update with addtl info (normally from custom.sty)
    let tag = this.tags.get(marker);
    if (tag == null) {
      tag = new UsfmTag(marker);
      if (marker !== 'c' && marker !== 'v') {
        tag.textProperties = UsfmTextProperties.Publishable;
      }
      this.tags.set(marker, tag);
    }
    return tag;
  }
}

const JUSTIFICATION_MAPPINGS = new Map<string, UsfmJustification>([
  ['left', UsfmJustification.Left],
  ['center', UsfmJustification.Center],
  ['right', UsfmJustification.Right],
  ['both', UsfmJustification.Both],
]);

const STYLE_MAPPINGS = new Map<string, UsfmStyleType>([
  ['character', UsfmStyleType.Character],
  ['paragraph', UsfmStyleType.Paragraph],
  ['note', UsfmStyleType.Note],
  ['milestone', UsfmStyleType.Milestone],
]);

const TEXT_TYPE_MAPPINGS = new Map<string, UsfmTextType>([
  ['title', UsfmTextType.Title],
  ['section', UsfmTextType.Section],
  ['versetext', UsfmTextType.VerseText],
  ['notetext', UsfmTextType.NoteText],
  ['other', UsfmTextType.Other],
  ['backtranslation', UsfmTextType.BackTranslation],
  ['translationnote"', UsfmTextType.TranslationNote],
  ['versenumber', UsfmTextType.VerseText],
  ['chapternumber', UsfmTextType.Other],
]);

const TEXT_PROPERTY_MAPPINGS = new Map<string, UsfmTextProperties>([
  ['verse', UsfmTextProperties.Verse],
  ['chapter', UsfmTextProperties.Chapter],
  ['paragraph', UsfmTextProperties.Paragraph],
  ['publishable', UsfmTextProperties.Publishable],
  ['vernacular', UsfmTextProperties.Vernacular],
  ['poetic', UsfmTextProperties.Poetic],
  ['level_1', UsfmTextProperties.Level1],
  ['level_2', UsfmTextProperties.Level2],
  ['level_3', UsfmTextProperties.Level3],
  ['level_4', UsfmTextProperties.Level4],
  ['level_5', UsfmTextProperties.Level5],
  ['crossreference', UsfmTextProperties.CrossReference],
  ['nonpublishable', UsfmTextProperties.Nonpublishable],
  ['nonvernacular', UsfmTextProperties.Nonvernacular],
  ['book', UsfmTextProperties.Book],
  ['note', UsfmTextProperties.Note],
]);

function splitStylesheet(contents: string): [string, string][] {
  const lines = contents.split('\n');
  const entries: [string, string][] = [];
  for (let line of lines) {
    if (line.startsWith('#!')) {
      line = line.substring(2);
    }
    line = line.split('#')[0].trim();
    if (line === '') {
      continue;
    }
    if (!line.startsWith('\\')) {
      // ignore lines that do not start with a backslash
      continue;
    }
    const parts = line.split(' ', 2);
    entries.push([parts[0].substring(1).toLowerCase(), parts.length > 1 ? parts[1].trim() : '']);
  }
  return entries;
}

function parseTextProperties(marker: UsfmTag, entryText: string): void {
  entryText = entryText.toLowerCase();
  const parts = entryText.split(' ');

  for (const part of parts) {
    if (part.trim() === '') {
      continue;
    }

    const textProperty = TEXT_PROPERTY_MAPPINGS.get(part);
    if (textProperty != null) {
      marker.textProperties |= textProperty;
    }
  }

  if ((marker.textProperties & UsfmTextProperties.Nonpublishable) === UsfmTextProperties.Nonpublishable) {
    marker.textProperties &= ~UsfmTextProperties.Publishable;
  }
}

function parseTextType(marker: UsfmTag, entryText: string): void {
  entryText = entryText.toLowerCase();
  if (entryText === 'chapternumber') {
    marker.textProperties |= UsfmTextProperties.Chapter;
  }
  if (entryText === 'versenumber') {
    marker.textProperties |= UsfmTextProperties.Verse;
  }

  const textType = TEXT_TYPE_MAPPINGS.get(entryText);
  if (textType != null) {
    marker.textType = textType;
  }
}

function parseAttributes(tag: UsfmTag, entryText: string): void {
  const attributeNames = entryText.split(' ');
  if (attributeNames.length === 0) {
    throw new Error('Attributes cannot be empty.');
  }
  let foundOptional = false;
  for (const attribute of attributeNames) {
    const isOptional = attribute.startsWith('?');
    if (!isOptional && foundOptional) {
      throw new Error('Required attributes must precede optional attributes.');
    }

    tag.attributes.push(new UsfmStyleAttribute(isOptional ? attribute.substring(1) : attribute, !isOptional));
    if (isOptional) {
      foundOptional = true;
    }
  }

  tag.defaultAttributeName =
    tag.attributes.filter((a) => a.isRequired).length <= 1 ? tag.attributes[0].name : undefined;
}

function parseTagEntry(tag: UsfmTag, entries: [string, string][], entryIndex: number): UsfmTag | undefined {
  // The following items are present for conformance with Paratext release 5.0 stylesheets.  Release 6.0 and later
  // follows the guidelines set in InitPropertyMaps.

  // Make sure \id gets book property
  if (tag.marker === 'id') {
    tag.textProperties |= UsfmTextProperties.Book;
  }

  let endTag: UsfmTag | undefined = undefined;
  while (entryIndex < entries.length) {
    const [entryMarker, entryText] = entries[entryIndex];
    entryIndex++;

    if (entryMarker === 'marker') {
      break;
    }

    switch (entryMarker) {
      case 'name':
        tag.name = entryText;
        break;
      case 'description':
        tag.description = entryText;
        break;
      case 'fontname':
        tag.fontName = entryText;
        break;
      case 'fontsize':
        if (entryText === '-') {
          tag.fontSize = 0;
        } else {
          const fontSize = parseInt(entryText);
          if (!isNaN(fontSize) && fontSize >= 0) {
            tag.fontSize = fontSize;
          }
        }
        break;
      case 'xmltag':
        tag.xmlTag = entryText;
        break;
      case 'encoding':
        tag.encoding = entryText;
        break;
      case 'linespacing': {
        const lineSpacing = parseInt(entryText);
        if (!isNaN(lineSpacing) && lineSpacing >= 0) {
          tag.lineSpacing = lineSpacing;
        }
        break;
      }
      case 'spacebefore': {
        const spaceBefore = parseInt(entryText);
        if (!isNaN(spaceBefore) && spaceBefore >= 0) {
          tag.spaceBefore = spaceBefore;
        }
        break;
      }
      case 'spaceafter': {
        const spaceAfter = parseInt(entryText);
        if (!isNaN(spaceAfter) && spaceAfter >= 0) {
          tag.spaceAfter = spaceAfter;
        }
        break;
      }
      case 'leftmargin': {
        const leftMargin = parseInt(entryText);
        if (!isNaN(leftMargin) && leftMargin >= 0) {
          tag.leftMargin = leftMargin;
        }
        break;
      }
      case 'rightmargin': {
        const rightMargin = parseInt(entryText);
        if (!isNaN(rightMargin) && rightMargin >= 0) {
          tag.rightMargin = rightMargin;
        }
        break;
      }
      case 'firstlineindent': {
        const firstLineIndent = parseFloat(entryText);
        if (!isNaN(firstLineIndent)) {
          tag.firstLineIndent = Math.trunc(firstLineIndent * 1000);
        }
        break;
      }
      case 'rank':
        if (entryText === '-') {
          tag.rank = 0;
        } else {
          const rank = parseInt(entryText);
          if (!isNaN(rank) && rank >= 0) {
            tag.rank = rank;
          }
        }
        break;
      case 'bold':
        tag.bold = entryText !== '-';
        break;
      case 'smallcaps':
        tag.smallCaps = entryText !== '-';
        break;
      case 'subscript':
        tag.subscript = entryText !== '-';
        break;
      case 'italic':
        tag.italic = entryText !== '-';
        break;
      case 'regular':
        tag.italic = false;
        tag.bold = false;
        tag.superscript = false;
        tag.regular = true;
        break;
      case 'underline':
        tag.underline = entryText !== '-';
        break;
      case 'superscript':
        tag.superscript = entryText !== '-';
        break;
      case 'notrepeatable':
        tag.notRepeatable = entryText !== '-';
        break;
      case 'textproperties':
        parseTextProperties(tag, entryText);
        break;
      case 'texttype':
        parseTextType(tag, entryText);
        break;
      case 'color':
        if (entryText === '-') {
          tag.color = 0;
        } else {
          const color = parseInt(entryText);
          if (!isNaN(color) && color >= 0) {
            tag.color = color;
          }
        }
        break;
      case 'justification': {
        const justification = JUSTIFICATION_MAPPINGS.get(entryText.toLowerCase());
        if (justification != null) {
          tag.justification = justification;
        }
        break;
      }
      case 'styletype': {
        const styleType = STYLE_MAPPINGS.get(entryText.toLowerCase());
        if (styleType != null) {
          tag.styleType = styleType;
        }
        break;
      }
      case 'occursunder':
        for (const occursUnder of entryText.split('')) {
          tag.occursUnder.add(occursUnder);
        }
        break;
      case 'endmarker':
        endTag = new UsfmTag(entryText);
        endTag.styleType = UsfmStyleType.End;
        tag.endMarker = entryText;
        break;
      case 'attributes':
        parseAttributes(tag, entryText);
        break;
    }
  }

  // If we have not seen an end marker but this is a character style
  if (tag.styleType === UsfmStyleType.Character && endTag == null) {
    const endMarkerStr = tag.marker + '*';
    endTag = new UsfmTag(endMarkerStr);
    endTag.styleType = UsfmStyleType.End;
    tag.endMarker = endMarkerStr;
  } else if (tag.styleType === UsfmStyleType.Milestone) {
    if (endTag != null) {
      endTag.styleType = UsfmStyleType.MilestoneEnd;
      // eid is always an optional attribute for the end marker
      tag.attributes.push(new UsfmStyleAttribute('eid', false));
      endTag.name = tag.name;
    }
  }

  // Special cases
  if (
    tag.textType === UsfmTextType.Other &&
    (tag.textProperties & UsfmTextProperties.Nonpublishable) === 0 &&
    (tag.textProperties & UsfmTextProperties.Chapter) === 0 &&
    (tag.textProperties & UsfmTextProperties.Verse) === 0 &&
    (tag.styleType === UsfmStyleType.Character || tag.styleType === UsfmStyleType.Paragraph)
  ) {
    tag.textProperties |= UsfmTextProperties.Publishable;
  }
  return endTag;
}
