import { describe, expect, it } from 'vitest';
import { toFormData } from '@/shared/api/form-data';

const entries = (fd: FormData) =>
  [...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : 'FILE']);

describe('toFormData', () => {
  it('writes scalars, booleans as strings, and skips null/undefined', () => {
    const fd = toFormData({
      Id: 0,
      Status: true,
      Name: 'x',
      Icon: null,
      Logo: undefined,
    });
    expect(entries(fd)).toEqual([
      ['Id', '0'],
      ['Status', 'true'],
      ['Name', 'x'],
    ]);
  });

  it('uses dotted keys for nested objects', () => {
    expect(entries(toFormData({ Reason: { Reason: 'holiday' } }))).toEqual([
      ['Reason.Reason', 'holiday'],
    ]);
  });

  it('indexes object arrays compactly and repeats scalar arrays', () => {
    const fd = toFormData({
      Translations: [null, { langId: 2, Name: 'ع' }],
      slotTimeIds: [101, 102],
    });
    expect(entries(fd)).toEqual([
      ['Translations[0].langId', '2'],
      ['Translations[0].Name', 'ع'],
      ['slotTimeIds', '101'],
      ['slotTimeIds', '102'],
    ]);
  });

  it('nests arrays inside arrays (slot Set payload)', () => {
    const fd = toFormData({
      requests: [
        {
          day: 4,
          times: [{ from: '05:00', services: [{ id: 0, isDeleted: false }] }],
        },
      ],
    });
    expect(entries(fd)).toEqual([
      ['requests[0].day', '4'],
      ['requests[0].times[0].from', '05:00'],
      ['requests[0].times[0].services[0].id', '0'],
      ['requests[0].times[0].services[0].isDeleted', 'false'],
    ]);
  });

  it('repeats the key for file lists', () => {
    const file = new File(['a'], 'a.pdf');
    expect(entries(toFormData({ ProposalFiles: [file, file] }))).toEqual([
      ['ProposalFiles', 'FILE'],
      ['ProposalFiles', 'FILE'],
    ]);
  });
});
