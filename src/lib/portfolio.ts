export type Asset = "BTC" | "ETH" | "SOL";
export type TransactionKind = "DCA" | "CONVERSION";

export type PortfolioTransaction = {
  id: string;
  kind: TransactionKind;
  asset: Asset;
  quantity: number;
  price_usd: number;
  fee_usd: number;
  cash_amount_usd: number;
  conversion_value_usd: number;
  source_altcoin_symbol: string | null;
  source_altcoin_quantity: number | null;
  source_altcoin_cost_usd: number | null;
  executed_at: string;
};

export type PriceMap = Record<Asset, number>;

export type PositionSummary = {
  asset: Asset;
  quantity: number;
  costBasisUsd: number;
  avgCostUsd: number;
  marketPriceUsd: number;
  marketValueUsd: number;
  originalCashUsd: number;
  conversionValueUsd: number;
  pnlUsd: number;
  roi: number;
};

export function calculatePositions(
  transactions: PortfolioTransaction[],
  prices: PriceMap,
): PositionSummary[] {
  const grouped = new Map<Asset, PortfolioTransaction[]>();

  for (const transaction of transactions) {
    grouped.set(transaction.asset, [
      ...(grouped.get(transaction.asset) ?? []),
      transaction,
    ]);
  }

  return (["BTC", "ETH", "SOL"] as Asset[]).map((asset) => {
    const rows = grouped.get(asset) ?? [];
    const quantity = sum(rows, (row) => row.quantity);
    const costBasisUsd = sum(rows, (row) => row.quantity * row.price_usd + row.fee_usd);
    const originalCashUsd = sum(rows, (row) => row.cash_amount_usd + row.fee_usd);
    const conversionValueUsd = sum(rows, (row) => row.conversion_value_usd);
    const marketPriceUsd = prices[asset] ?? 0;
    const marketValueUsd = quantity * marketPriceUsd;
    const pnlUsd = marketValueUsd - costBasisUsd;

    return {
      asset,
      quantity,
      costBasisUsd,
      avgCostUsd: quantity > 0 ? costBasisUsd / quantity : 0,
      marketPriceUsd,
      marketValueUsd,
      originalCashUsd,
      conversionValueUsd,
      pnlUsd,
      roi: costBasisUsd > 0 ? pnlUsd / costBasisUsd : 0,
    };
  });
}

export function calculateTotals(positions: PositionSummary[]) {
  const costBasisUsd = sum(positions, (position) => position.costBasisUsd);
  const marketValueUsd = sum(positions, (position) => position.marketValueUsd);

  return {
    costBasisUsd,
    marketValueUsd,
    originalCashUsd: sum(positions, (position) => position.originalCashUsd),
    conversionValueUsd: sum(positions, (position) => position.conversionValueUsd),
    pnlUsd: marketValueUsd - costBasisUsd,
    roi: costBasisUsd > 0 ? (marketValueUsd - costBasisUsd) / costBasisUsd : 0,
  };
}

function sum<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});
