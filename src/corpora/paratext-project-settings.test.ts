import { ScrVers } from '@sillsdev/scripture';

import { ParatextProjectSettings } from './paratext-project-settings';
import { UsfmStylesheet } from './usfm-stylesheet';

describe('ParatextProjectSettings', () => {
  it('getBookFileName - book number', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('MRK')).toEqual('PROJ42.SFM');
  });

  it('getBookFileName - book number and id', () => {
    const settings = createSettings('41MAT');
    expect(settings.getBookFileName('MRK')).toEqual('PROJ42MRK.SFM');
  });

  it('getBookFileName - book id', () => {
    const settings = createSettings('MAT');
    expect(settings.getBookFileName('MRK')).toEqual('PROJMRK.SFM');
  });

  it('getBookFileName - book number with zero padding', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('GEN')).toEqual('PROJ01.SFM');
  });

  it('getBookFileName - XXG', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('XXG')).toEqual('PROJ100.SFM');
  });

  it('getBookFileName - book number with A prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('FRT')).toEqual('PROJA0.SFM');
  });

  it('getBookFileName - book number with B prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('TDX')).toEqual('PROJB0.SFM');
  });

  it('getBookFileName - book number with C prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookFileName('3MQ')).toEqual('PROJC0.SFM');
  });

  it('getBookId - book number', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJ42.SFM')).toEqual('MRK');
  });

  it('getBookId - book number and id', () => {
    const settings = createSettings('41MAT');
    expect(settings.getBookId('PROJ42MRK.SFM')).toEqual('MRK');
  });

  it('getBookId - book id', () => {
    const settings = createSettings('MAT');
    expect(settings.getBookId('PROJMRK.SFM')).toEqual('MRK');
  });

  it('getBookId - book number with zero padding', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJ01.SFM')).toEqual('GEN');
  });

  it('getBookId - XXG - book number', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJ100.SFM')).toEqual('XXG');
  });

  it('getBookId - XXG - book number and id', () => {
    const settings = createSettings('41MAT');
    expect(settings.getBookId('PROJ100XXG.SFM')).toEqual('XXG');
  });

  it('getBookId - book number with A prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJA0.SFM')).toEqual('FRT');
  });

  it('getBookId - book number with B prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJB0.SFM')).toEqual('TDX');
  });

  it('getBookId - book number with C prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJC0.SFM')).toEqual('3MQ');
  });

  it('getBookId - wrong prefix', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('WRONG42.SFM')).toBeUndefined();
  });

  it('getBookId - wrong suffix', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJ42.TXT')).toBeUndefined();
  });

  it('getBookId - wrong book number', () => {
    const settings = createSettings('41');
    expect(settings.getBookId('PROJ42MRK.SFM')).toBeUndefined();
  });

  it('getBookId - wrong book id', () => {
    const settings = createSettings('MAT');
    expect(settings.getBookId('PROJ42.SFM')).toBeUndefined();
  });

  it('getBookId - wrong book number and id', () => {
    const settings = createSettings('41MAT');
    expect(settings.getBookId('PROJMRK.SFM')).toBeUndefined();
    expect(settings.getBookId('PROJ100.SFM')).toBeUndefined();
  });
});

function createSettings(fileNameForm: string): ParatextProjectSettings {
  return new ParatextProjectSettings(
    'Name',
    'Name',
    'utf8',
    ScrVers.English,
    new UsfmStylesheet('usfm.sty'),
    'PROJ',
    fileNameForm,
    '.SFM',
    'Major',
    '',
    'BiblicalTerms.xml',
    'en',
  );
}
