import { access, readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { ParatextProjectSettingsParserBase } from './paratext-project-settings-parser-base';
import { createUsfmStylesheet, UsfmStylesheet } from './usfm-stylesheet';

export class FileParatextProjectSettingsParser extends ParatextProjectSettingsParserBase {
  constructor(private readonly projectDir: string) {
    super();
  }

  protected async createStylesheet(fileName: string): Promise<UsfmStylesheet> {
    const customStylesheetFileName = join(this.projectDir, fileName);
    return await createUsfmStylesheet(
      fileName,
      (await this.exists(customStylesheetFileName)) ? customStylesheetFileName : undefined,
    );
  }

  protected async exists(fileName: string): Promise<boolean> {
    try {
      await access(join(this.projectDir, fileName));
      return true;
    } catch {
      return false;
    }
  }

  protected async find(extension: string): Promise<string | undefined> {
    return (await readdir(this.projectDir)).find((fileName) => fileName.endsWith(extension));
  }

  protected open(fileName: string): Promise<Buffer> {
    return readFile(join(this.projectDir, fileName));
  }
}
