import { Canon, ScrVers } from '@sillsdev/scripture';

import { UsfmStylesheet } from './usfm-stylesheet';

export class ParatextProjectSettings {
  constructor(
    public readonly name: string,
    public readonly fullName: string,
    public readonly encoding: string,
    public readonly versification: ScrVers,
    public readonly stylesheet: UsfmStylesheet,
    public readonly fileNamePrefix: string,
    public readonly fileNameForm: string,
    public readonly fileNameSuffix: string,
    public readonly biblicalTermsListType: string,
    public readonly biblicalTermsProjectName: string,
    public readonly biblicalTermsFileName: string,
    public readonly languageCode?: string,
  ) {}

  getBookId(fileName: string): string | undefined {
    if (!fileName.startsWith(this.fileNamePrefix) || !fileName.endsWith(this.fileNameSuffix)) {
      return undefined;
    }

    const bookPart = fileName.substring(this.fileNamePrefix.length, fileName.length - this.fileNameSuffix.length);
    if (this.fileNameForm === 'MAT') {
      if (bookPart.length !== 3) {
        return undefined;
      }
      return bookPart;
    }
    if (this.fileNameForm === '40' || this.fileNameForm === '41') {
      if (bookPart !== '100' && bookPart.length !== 2) {
        return undefined;
      }
      return Canon.bookNumberToId(getBookNumber(bookPart));
    }

    if (bookPart.startsWith('100')) {
      if (bookPart.length !== 6) {
        return undefined;
      }
    } else if (bookPart.length !== 5) {
      return undefined;
    }
    return bookPart.length === 5 ? bookPart.substring(2) : bookPart.substring(3);
  }

  getBookFileName(bookId: string): string {
    let bookPart: string;
    if (this.fileNameForm === 'MAT') {
      bookPart = bookId;
    }
    if (this.fileNameForm === '40' || this.fileNameForm === '41') {
      bookPart = getBookFileNameDigits(bookId);
    } else {
      bookPart = getBookFileNameDigits(bookId) + bookId;
    }
    return this.fileNamePrefix + bookPart + this.fileNameSuffix;
  }
}

function getBookFileNameDigits(bookId: string): string {
  const bookNum = Canon.bookIdToNumber(bookId);
  if (bookNum < 10) {
    return '0' + bookNum.toString();
  }
  if (bookNum < 40) {
    return bookNum.toString();
  }
  if (bookNum < 100) {
    return (bookNum + 1).toString();
  }
  if (bookNum < 110) {
    return 'A' + (bookNum - 100).toString();
  }
  if (bookNum < 120) {
    return 'B' + (bookNum - 110).toString();
  }
  return 'C' + (bookNum - 120).toString();
}

function getBookNumber(bookFileNameDigits: string): number {
  if (bookFileNameDigits.startsWith('A')) {
    return 100 + parseInt(bookFileNameDigits.substring(1));
  }
  if (bookFileNameDigits.startsWith('B')) {
    return 110 + parseInt(bookFileNameDigits.substring(1));
  }
  if (bookFileNameDigits.startsWith('C')) {
    return 120 + parseInt(bookFileNameDigits.substring(1));
  }

  const bookNum = parseInt(bookFileNameDigits);
  if (bookNum >= 40) {
    return bookNum - 1;
  }
  return bookNum;
}
