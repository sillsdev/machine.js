/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ScrVers } from '@sillsdev/scripture';
import { XMLParser } from 'fast-xml-parser';

import { getEncoding } from './corpora-utils';
import { ParatextProjectSettings } from './paratext-project-settings';
import { UsfmStylesheet } from './usfm-stylesheet';

export abstract class ParatextProjectSettingsParserBase {
  async parse(): Promise<ParatextProjectSettings> {
    let settingsFileName: string | undefined = 'Settings.xml';
    if (!(await this.exists(settingsFileName))) {
      settingsFileName = await this.find('.ssf');
    }
    if (settingsFileName == null) {
      throw new Error('The project does not contain a settings file.');
    }
    const parser = new XMLParser();

    const settingsXml = parser.parse(await this.open(settingsFileName));
    const root = settingsXml.ScriptureText;
    const name = (root.Name as string | undefined) ?? '';
    const fullName = (root.FullName as string | undefined) ?? '';
    const encodingStr = (root.Encoding as string | undefined) ?? '65001';
    const codePage = parseInt(encodingStr);
    if (isNaN(codePage)) {
      throw new Error(`The project uses a legacy encoding that requires TECKit, map file: ${encodingStr}.`);
    }
    const encoding = getEncoding(codePage);
    if (encoding == null) {
      throw new Error(`Code page ${codePage.toString()} not supported.`);
    }

    const versificationType = (root.Versification as string | undefined) ?? '4';
    const versification = new ScrVers(parseInt(versificationType));
    let stylesheetFileName = (root.StyleSheet as string | undefined) ?? 'usfm.sty';
    if (!(await this.exists(stylesheetFileName)) && stylesheetFileName !== 'usfm_sb.sty') {
      stylesheetFileName = 'usfm.sty';
    }
    const stylesheet = await this.createStylesheet(stylesheetFileName);

    let prefix = '';
    let form = '41MAT';
    let suffix = '.SFM';
    const namingElem = root.Naming;
    if (namingElem != null) {
      const prePart = namingElem.PrePart as string | undefined;
      if (prePart != null) {
        prefix = prePart;
      }
      const bookNameForm = namingElem.BookNameForm as string | undefined;
      if (bookNameForm != null) {
        form = bookNameForm;
      }
      const postPart = namingElem.PostPart as string | undefined;
      if (postPart != null) {
        suffix = postPart;
      }
    }
    const biblicalTermsListSetting =
      (root.BiblicalTermsListSetting as string | undefined) ?? 'Major::BiblicalTerms.xml';
    const biblicalTermsListParts = biblicalTermsListSetting.split(':', 2);
    if (biblicalTermsListParts.length !== 3) {
      throw new Error(
        `The BiblicalTermsListSetting element in Settings.xml in project ${fullName} is not in the` +
          ` expected format (e.g., Major::BiblicalTerms.xml) but is ${biblicalTermsListSetting}.`,
      );
    }
    let languageCode: string | undefined = undefined;
    const languageIsoCodeSetting = (root.LanguageIsoCode as string | undefined) ?? '';
    if (languageIsoCodeSetting !== '') {
      const languageIsoCodeParts = languageIsoCodeSetting.split(':');
      if (languageIsoCodeParts.length > 0) {
        languageCode = languageIsoCodeParts[0];
      }
    }

    return new ParatextProjectSettings(
      name,
      fullName,
      encoding,
      versification,
      stylesheet,
      prefix,
      form,
      suffix,
      biblicalTermsListParts[0],
      biblicalTermsListParts[1],
      biblicalTermsListParts[2],
      languageCode,
    );
  }

  protected abstract exists(fileName: string): Promise<boolean>;
  protected abstract find(extension: string): Promise<string | undefined>;
  protected abstract open(fileName: string): Promise<Buffer>;
  protected abstract createStylesheet(fileName: string): Promise<UsfmStylesheet>;
}
