import { UsfmAttribute } from './usfm-attribute';

export enum UsfmTokenType {
  Book,
  Chapter,
  Verse,
  Text,
  Paragraph,
  Character,
  Note,
  End,
  Milestone,
  MilestoneEnd,
  Attribute,
  Unknown,
}

const ATTRIBUTE_REGEX = /([-\w]+)\s*=\s*"(.+?)"\s*/g;
const ATTRIBUTES_REGEX = new RegExp('(?<full>(' + ATTRIBUTE_REGEX.source + ')+)|(?<default>[^\\=|]*)');

export class UsfmToken {
  private _attributes?: UsfmAttribute[];
  private _defaultAttributeName?: string;

  constructor(
    public readonly type: UsfmTokenType,
    public readonly marker?: string,
    public text?: string,
    public readonly endMarker?: string,
    public readonly data?: string,
    public readonly lineNumber = -1,
    public readonly columnNumber = -1,
  ) {}

  get attributes(): readonly UsfmAttribute[] | undefined {
    return this._attributes;
  }

  get nestlessMarker(): string | undefined {
    return this.marker?.startsWith('+') ? this.marker.substring(1) : this.marker;
  }

  getAttribute(name: string): string {
    if (this.attributes == null || this.attributes.length === 0) {
      return '';
    }

    const attribute = this.attributes.find((attr) => attr.name === name);
    return attribute?.value ?? '';
  }

  setAttributes(attributes: UsfmAttribute[], defaultAttributeName?: string): void;
  setAttributes(
    attributesValue: string,
    defaultAttributeName: string | undefined,
    text: string,
    preserveWhitespace?: boolean,
  ): string | undefined;
  setAttributes(
    attributesValue: string | UsfmAttribute[],
    defaultAttributeName?: string,
    text?: string,
    preserveWhitespace = false,
  ): string | undefined {
    if (Array.isArray(attributesValue)) {
      this._attributes = attributesValue;
      this._defaultAttributeName = defaultAttributeName;
      return;
    }

    if (attributesValue.length === 0 || this.marker == null || text == null) {
      return undefined;
    }

    // for figures, convert 2.0 format to 3.0 format. Will need to write this as the 2.0 format
    // if the project is not upgraded.
    if (this.nestlessMarker === 'fig') {
      const parts = attributesValue.split('|');
      if (parts.length === 7) {
        const attributeList: UsfmAttribute[] = [];
        this.appendAttribute(attributeList, 'alt', text);
        this.appendAttribute(attributeList, 'src', parts[0]);
        this.appendAttribute(attributeList, 'size', parts[1]);
        this.appendAttribute(attributeList, 'loc', parts[2]);
        this.appendAttribute(attributeList, 'copy', parts[3]);
        let whitespace = '';
        if (preserveWhitespace) {
          whitespace = text.substring(0, text.trimStart().length);
        }
        text = whitespace + parts[4];
        this.appendAttribute(attributeList, 'ref', parts[5]);
        this._attributes = attributeList;
        return text;
      }
    }

    const match = ATTRIBUTES_REGEX.exec(attributesValue);
    if (match == null || match[0].length !== attributesValue.length) {
      return undefined;
    }

    const defaultValue = match.groups?.default;
    if (defaultValue != null) {
      if (defaultAttributeName != null) {
        this._attributes = [new UsfmAttribute(defaultAttributeName, defaultValue)];
        this._defaultAttributeName = defaultAttributeName;
        return text;
      }
      return undefined;
    }

    const full = match.groups?.full;
    if (full == null) {
      return undefined;
    }

    this._defaultAttributeName = defaultAttributeName;
    this._attributes = [];
    let i = 0;
    for (const attrMatch of full.matchAll(ATTRIBUTE_REGEX)) {
      this._attributes.push(new UsfmAttribute(attrMatch[1], attrMatch[2], i));
      i++;
    }
    return text;
  }

  copyAttributes(sourceToken: UsfmToken): void {
    this._attributes = sourceToken._attributes;
    this._defaultAttributeName = sourceToken._defaultAttributeName;
  }

  private appendAttribute(attributes: UsfmAttribute[], name: string, value: string | undefined): void {
    value = value?.trim();
    if (value != null && value.length > 0) {
      attributes.push(new UsfmAttribute(name, value));
    }
  }

  getLength(includeNewlines = false, addSpaces = true): number {
    // WARNING: This logic in this method needs to match the logic in toUsfm()

    let totalLength = this.text?.length ?? 0;
    if (this.type === UsfmTokenType.Attribute) {
      totalLength += this.toAttributesString().length;
    } else if (this.marker != null) {
      if (
        includeNewlines &&
        (this.type === UsfmTokenType.Paragraph ||
          this.type === UsfmTokenType.Chapter ||
          this.type === UsfmTokenType.Verse)
      ) {
        totalLength += 2;
      }
      totalLength += this.marker.length + 1; // marker and backslash
      if (addSpaces && (this.marker.length === 0 || !this.marker.endsWith('*'))) {
        totalLength++; // space
      }

      if (this.data != null && this.data.length > 0) {
        if (!addSpaces && (this.marker.length === 0 || !this.marker.endsWith('*'))) {
          totalLength++;
        }
        totalLength += this.data.length;
        if (addSpaces) {
          totalLength++;
        }
      }

      if (this.type === UsfmTokenType.Milestone || this.type === UsfmTokenType.MilestoneEnd) {
        const attributes = this.toAttributesString();
        if (attributes.length > 0) {
          totalLength += attributes.length;
        } else {
          // remove space that was put after marker - not needed when there are no attributes.
          totalLength--;
        }

        totalLength += 2; // End of the milestone
      }
    }

    return totalLength;
  }

  toUsfm(includeNewlines = false, addSpaces = true): string {
    // WARNING: The logic in this method needs to match the logic in getLength()

    let toReturn = this.text ?? '';
    if (this.type === UsfmTokenType.Attribute) {
      toReturn += this.toAttributesString();
    } else if (this.marker != null) {
      if (
        includeNewlines &&
        (this.type === UsfmTokenType.Paragraph ||
          this.type === UsfmTokenType.Chapter ||
          this.type === UsfmTokenType.Verse)
      ) {
        toReturn += '\r\n';
      }
      toReturn += '\\';
      if (this.marker.length > 0) {
        toReturn += this.marker;
      }
      if (addSpaces && (this.marker.length === 0 || !this.marker.endsWith('*'))) {
        toReturn += ' ';
      }

      if (this.data != null && this.data.length > 0) {
        if (!addSpaces && (this.marker.length === 0 || !this.marker.endsWith('*'))) {
          toReturn += ' ';
        }
        toReturn += this.data;
        if (addSpaces) {
          toReturn += ' ';
        }
      }

      if (this.type === UsfmTokenType.Milestone || this.type === UsfmTokenType.MilestoneEnd) {
        const attributes = this.toAttributesString();
        if (attributes.length > 0) {
          toReturn += attributes;
        } else {
          // remove space that was put after marker - not needed when there are no attributes.
          toReturn = toReturn.substring(0, toReturn.length - 1);
        }
        toReturn += '\\*';
      }
    }
    return toReturn;
  }

  toAttributesString(): string {
    if (this.attributes == null || this.attributes.length === 0) {
      return '';
    }

    if (this.data != null && this.data !== '') {
      return '|' + this.data;
    }

    if (this.attributes.length === 1 && this.attributes[0].name === this._defaultAttributeName) {
      return '|' + this.attributes[0].value;
    }

    return '|' + this.attributes.map((attr) => attr.toString()).join(' ');
  }

  toString(): string {
    return this.toUsfm(false, false);
  }
}
