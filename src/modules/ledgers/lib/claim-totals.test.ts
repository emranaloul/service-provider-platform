import { describe, expect, it } from 'vitest';
import { claimTaxTotals } from '@/modules/ledgers/lib/claim-totals';

describe('claimTaxTotals', () => {
  it('is zero for no orders', () => {
    expect(claimTaxTotals([])).toEqual({ costWithTax: 0, sellPriceWithTax: 0 });
  });

  it('sums cost + costTax and sellPrice + sellPriceTax', () => {
    expect(
      claimTaxTotals([
        { cost: 100, costTax: 15, sellPrice: 200, sellPriceTax: 30 },
        { cost: 50.5, costTax: 7.5, sellPrice: 80, sellPriceTax: 0 },
      ]),
    ).toEqual({ costWithTax: 173, sellPriceWithTax: 310 });
  });
});
