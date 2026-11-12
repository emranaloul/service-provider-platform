import type { Order } from '@/modules/reservations/api/types';

export interface ClaimTaxTotals {
  /** Sum of `cost + costTax` — matches the table's "cost with tax". */
  costWithTax: number;
  /** Sum of `sellPrice + sellPriceTax`. */
  sellPriceWithTax: number;
}

/**
 * Totals with tax for the selected orders. The spec summary (`claimSummary`,
 * §14.3) sums the amounts before tax; these are shown next to it so the
 * figures line up with the "cost with tax" column.
 */
export function claimTaxTotals(
  orders: readonly Pick<
    Order,
    'cost' | 'costTax' | 'sellPrice' | 'sellPriceTax'
  >[],
): ClaimTaxTotals {
  return orders.reduce<ClaimTaxTotals>(
    (acc, o) => ({
      costWithTax: acc.costWithTax + o.cost + o.costTax,
      sellPriceWithTax: acc.sellPriceWithTax + o.sellPrice + o.sellPriceTax,
    }),
    { costWithTax: 0, sellPriceWithTax: 0 },
  );
}
