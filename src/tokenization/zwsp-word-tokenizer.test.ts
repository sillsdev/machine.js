import { ZwspWordTokenizer } from './zwsp-word-tokenizer';

describe('ZwspWordTokenizer', () => {
  it('empty string', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('')).toEqual([]);
  });

  it('ZWSP-only string', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('\u200b')).toEqual([]);
  });

  it('string with space', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('គែស\u200bមាង់ អី\u200bនៃ\u200bជេង\u200bនារ\u200bត៝ល់\u200bព្វាន់។')).toEqual([
      'គែស',
      'មាង់',
      ' ',
      'អី',
      'នៃ',
      'ជេង',
      'នារ',
      'ត៝ល់',
      'ព្វាន់',
      '។'
    ]);
  });

  it('string with guillemet', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('ឞ្ក្នៃ\u200bរាញា «នារ» ជេសរី')).toEqual(['ឞ្ក្នៃ', 'រាញា', '«', 'នារ', '»', 'ជេសរី']);
  });

  it('string with punctuation', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('ไป\u200bไหน\u200bมา? เขา\u200bถาม\u200bผม.')).toEqual([
      'ไป',
      'ไหน',
      'มา',
      '?',
      'เขา',
      'ถาม',
      'ผม',
      '.'
    ]);

    expect(tokenizer.tokenize('ช้าง, ม้า, วัว, กระบือ')).toEqual(['ช้าง', ',', 'ม้า', ',', 'วัว', ',', 'กระบือ']);
  });

  it('string with punctuation inside word', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('เริ่ม\u200bต้น\u200bที่ 7,999 บาท')).toEqual([
      'เริ่ม',
      'ต้น',
      'ที่',
      ' ',
      '7,999',
      ' ',
      'บาท'
    ]);
  });

  it('string with multiple spaces', () => {
    const tokenizer = new ZwspWordTokenizer();
    expect(tokenizer.tokenize('គែស\u200bមាង់  អី\u200bនៃ\u200bជេង\u200bនារ\u200bត៝ល់\u200bព្វាន់។')).toEqual([
      'គែស',
      'មាង់',
      '  ',
      'អី',
      'នៃ',
      'ជេង',
      'នារ',
      'ត៝ល់',
      'ព្វាន់',
      '។'
    ]);

    expect(tokenizer.tokenize('ไป\u200bไหน\u200bมา?  เขา\u200bถาม\u200bผม.')).toEqual([
      'ไป',
      'ไหน',
      'มา',
      '?',
      'เขา',
      'ถาม',
      'ผม',
      '.'
    ]);
  });
});
