import { ZwspWordDetokenizer } from './zwsp-word-detokenizer';

describe('ZwspWordDetokenizer', () => {
  it('empty token array', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize([])).toEqual('');
  });

  it('array with space token', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize(['គែស', 'មាង់', ' ', 'អី', 'នៃ', 'ជេង', 'នារ', 'ត៝ល់', 'ព្វាន់', '។'])).toEqual(
      'គែស\u200bមាង់ អី\u200bនៃ\u200bជេង\u200bនារ\u200bត៝ល់\u200bព្វាន់។',
    );
  });

  it('array with guillemet token', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize(['ឞ្ក្នៃ', 'រាញា', '«', 'នារ', '»', 'ជេសរី'])).toEqual(
      'ឞ្ក្នៃ\u200bរាញា «នារ» ជេសរី',
    );
  });

  it('array with punctuation token', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize(['ไป', 'ไหน', 'มา', '?', 'เขา', 'ถาม', 'ผม', '.'])).toEqual(
      'ไป\u200bไหน\u200bมา? เขา\u200bถาม\u200bผม.',
    );

    expect(detokenizer.detokenize(['ช้าง', ',', 'ม้า', ',', 'วัว', ',', 'กระบือ'])).toEqual('ช้าง, ม้า, วัว, กระบือ');
  });

  it('array with punctuation inside word', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize(['เริ่ม', 'ต้น', 'ที่', ' ', '7,999', ' ', 'บาท'])).toEqual(
      'เริ่ม\u200bต้น\u200bที่ 7,999 บาท',
    );
  });

  it('array with multiple space token', () => {
    const detokenizer = new ZwspWordDetokenizer();
    expect(detokenizer.detokenize(['គែស', 'មាង់', '  ', 'អី', 'នៃ', 'ជេង', 'នារ', 'ត៝ល់', 'ព្វាន់', '។'])).toEqual(
      'គែស\u200bមាង់  អី\u200bនៃ\u200bជេង\u200bនារ\u200bត៝ល់\u200bព្វាន់។',
    );
  });
});
