export enum UsfmTextType {
  NotSpecified = 0x0,
  Title = 0x1,
  Section = 0x2,
  VerseText = 0x4,
  NoteText = 0x8,
  Other = 0x10,
  BackTranslation = 0x20,
  TranslationNote = 0x40,
}

export enum UsfmJustification {
  Left,
  Center,
  Right,
  Both,
}

export enum UsfmStyleType {
  Unknown,
  Character,
  Note,
  Paragraph,
  End,
  Milestone,
  MilestoneEnd,
}

export enum UsfmTextProperties {
  None = 0x0,
  Verse = 0x1,
  Chapter = 0x2,
  Paragraph = 0x4,
  Publishable = 0x8,
  Vernacular = 0x10,
  Poetic = 0x20,
  OtherTextBegin = 0x40,
  OtherTextEnd = 0x80,
  Level1 = 0x100,
  Level2 = 0x200,
  Level3 = 0x400,
  Level4 = 0x800,
  Level5 = 0x1000,
  CrossReference = 0x2000,
  Nonpublishable = 0x4000,
  Nonvernacular = 0x8000,
  Book = 0x10000,
  Note = 0x20000,
}

export class UsfmStyleAttribute {
  constructor(
    public readonly name: string,
    public readonly isRequired: boolean,
  ) {}
}

export class UsfmTag {
  public bold = false;
  public description?: string;
  public encoding?: string;
  public endMarker?: string;
  public firstLineIndent = 0;
  public fontName?: string;
  public fontSize = 0;
  public italic = false;
  public justification = UsfmJustification.Left;
  public leftMargin = 0;
  public lineSpacing = 0;
  public name?: string;
  public notRepeatable = false;
  public readonly occursUnder = new Set<string>();
  public rank = 0;
  public rightMargin = 0;
  public smallCaps = false;
  public spaceAfter = 0;
  public spaceBefore = 0;
  public styleType = UsfmStyleType.Unknown;
  public subscript = false;
  public superscript = false;
  public textProperties = UsfmTextProperties.None;
  public textType = UsfmTextType.NotSpecified;
  public underline = false;
  public xmlTag?: string;
  public regular = false;
  public color = 0;
  public readonly attributes: UsfmStyleAttribute[] = [];
  public defaultAttributeName?: string;

  constructor(public readonly marker: string) {}

  toString(): string {
    return `\\${this.marker}`;
  }
}
