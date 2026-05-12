"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Coins,
  Database,
  Flame,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthGate } from "@/components/auth-gate";
import { TransactionEntryForm } from "@/components/transaction-entry-form";
import {
  calculatePositions,
  calculateTotals,
  compactUsd,
  percent,
  type PortfolioTransaction,
  type PriceMap,
  usd,
} from "@/lib/portfolio";
import { getSupabaseClient } from "@/lib/supabase-client";

type PricesResponse = PriceMap & {
  stale: boolean;
  updatedAt: string;
};

async function fetchTransactions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .order("executed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as PortfolioTransaction[];
}

async function fetchPrices() {
  const response = await fetch("/api/prices");

  if (!response.ok) {
    throw new Error("获取价格失败。");
  }

  return response.json() as Promise<PricesResponse>;
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const transactionsQuery = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });
  const pricesQuery = useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    refetchInterval: 30_000,
  });

  const transactions = useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data],
  );
  const prices = useMemo(
    () =>
      pricesQuery.data ?? {
        BTC: 0,
        ETH: 0,
        SOL: 0,
        stale: true,
        updatedAt: new Date(0).toISOString(),
      },
    [pricesQuery.data],
  );

  const updatedAtText = useMemo(
    () =>
      new Date(prices.updatedAt).toLocaleString("zh-CN", {
        hour12: false,
      }),
    [prices.updatedAt],
  );

  const positions = useMemo(
    () => calculatePositions(transactions, prices),
    [prices, transactions],
  );
  const totals = useMemo(() => calculateTotals(positions), [positions]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const timeline = useMemo(() => {
    return [...transactions]
      .sort(
        (left, right) =>
          new Date(left.executed_at).getTime() -
          new Date(right.executed_at).getTime(),
      )
      .reduce<Array<{ date: string; cash: number; conversion: number; highlight: boolean }>>(
        (rows, transaction) => {
          const previous = rows.at(-1) ?? { cash: 0, conversion: 0 };
          const date = new Date(transaction.executed_at).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          });
          rows.push({
            date,
            cash: previous.cash + transaction.cash_amount_usd,
            conversion:
              previous.conversion + transaction.conversion_value_usd,
            highlight: date === todayLabel,
          });
          return rows;
        },
        [],
      );
  }, [todayLabel, transactions]);

  return (
    <main className="min-h-screen p-8 ui-title">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[272px_1fr]">
        <aside className="ui-glass p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
            Crypto2028
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight ui-title">
            投资组合
          </h1>
          <p className="ui-subtitle mt-2 text-sm leading-6">
            成本、仓位与盈亏一屏查看。
          </p>

          <div className="mt-8 grid gap-3">
            <PriceChip icon={Coins} label="BTC" value={usd.format(prices.BTC)} />
            <PriceChip icon={Flame} label="ETH" value={usd.format(prices.ETH)} />
            <PriceChip icon={Database} label="SOL" value={usd.format(prices.SOL)} />
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
              <Activity className="h-3.5 w-3.5" />
              行情状态
            </div>
            <p className="mt-2 text-xs text-slate-600">更新时间：{updatedAtText}</p>
            {prices.stale ? (
              <p className="mt-1 text-xs font-medium text-red-600">价格数据可能过期</p>
            ) : (
              <p className="mt-1 text-xs font-medium text-blue-600">数据连接正常</p>
            )}
          </div>
        </aside>

        <section className="grid gap-8">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="市值" value={usd.format(totals.marketValueUsd)} />
            <MetricCard label="成本基准" value={usd.format(totals.costBasisUsd)} />
            <MetricCard label="总盈亏" value={usd.format(totals.pnlUsd)} tone={totals.pnlUsd >= 0 ? "green" : "red"} />
            <MetricCard label="ROI" value={percent.format(totals.roi)} tone={totals.roi >= 0 ? "green" : "red"} />
            <MetricCard label="原始现金投入" value={usd.format(totals.originalCashUsd)} />
          </div>

          <div className="ui-card p-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold ui-title">资产分布</h2>
              <span className="text-xs text-slate-500">成本基准 vs 市值</span>
            </div>
            <div className="h-[304px]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={positions}>
                  <defs>
                    <linearGradient id="barCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <linearGradient id="barMarket" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis axisLine={false} dataKey="asset" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => compactUsd.format(value)} tickLine={false} />
                  <Tooltip formatter={(value) => usd.format(Number(value))} />
                  <Bar dataKey="costBasisUsd" fill="url(#barCost)" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="marketValueUsd" fill="url(#barMarket)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="ui-card p-8">
              <h2 className="mb-4 text-sm font-semibold ui-title">持仓明细</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="py-4 font-medium">资产</th>
                      <th className="py-4 text-right font-medium">数量</th>
                      <th className="py-4 text-right font-medium">平均成本</th>
                      <th className="py-4 text-right font-medium">价格</th>
                      <th className="py-4 text-right font-medium">价值</th>
                      <th className="py-4 text-right font-medium">盈亏</th>
                      <th className="py-4 text-right font-medium">ROI</th>
                      <th className="py-4 text-right font-medium">转换价值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position) => (
                      <tr className="border-b border-slate-100" key={position.asset}>
                        <td className="py-5 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold shadow-sm shadow-indigo-100/50">
                              {position.asset.slice(0, 1)}
                            </span>
                            {position.asset}
                          </span>
                        </td>
                        <td className="py-5 text-right text-slate-700">{position.quantity.toFixed(8)}</td>
                        <td className="py-5 text-right text-slate-700">{usd.format(position.avgCostUsd)}</td>
                        <td className="py-5 text-right text-slate-700">{usd.format(position.marketPriceUsd)}</td>
                        <td className="py-5 text-right text-slate-700">{usd.format(position.marketValueUsd)}</td>
                        <td className={position.pnlUsd >= 0 ? "py-5 text-right font-medium text-emerald-600" : "py-5 text-right font-medium text-red-600"}>
                          {usd.format(position.pnlUsd)}
                        </td>
                        <td className="py-5 text-right">
                          <span className={position.roi >= 0 ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700" : "inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"}>
                            {percent.format(position.roi)}
                          </span>
                        </td>
                        <td className="py-5 text-right text-slate-700">{usd.format(position.conversionValueUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-8">
              <div className="ui-card p-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold ui-title">资金来源</h2>
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis axisLine={false} dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} />
                      <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => compactUsd.format(value)} tickLine={false} />
                      <Tooltip formatter={(value) => usd.format(Number(value))} />
                      <Area dataKey="cash" fill="url(#cashFill)" stroke="#3b82f6" strokeWidth={2} type="monotone" />
                      <Area dataKey="conversion" fill="url(#convFill)" stroke="#8b5cf6" strokeWidth={2} type="monotone" />
                      <Area
                        dataKey="cash"
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (!payload?.highlight) {
                            return null;
                          }
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              fill="#2563eb"
                              r={4}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                          );
                        }}
                        fillOpacity={0}
                        isAnimationActive={false}
                        stroke="transparent"
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ui-card p-8">
                <TransactionEntryForm />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PriceChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="ui-chip ui-interactive flex items-center justify-between px-4 py-3 hover:scale-[1.02]">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </div>
      <span className="ui-title text-sm font-semibold">{value}</span>
    </div>
  );
}

function MetricCard({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "green" | "neutral" | "red";
  value: string;
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-slate-900";

  return (
    <div>
      <div className="ui-label mb-2">{label}</div>
      <div className="ui-card ui-interactive p-5 hover:scale-[1.02]">
        <div className={tone === "red" ? "text-xl font-medium tracking-tight text-red-600" : `text-2xl font-semibold tracking-tight ${toneClass}`}>
          {value}
        </div>
        {label === "ROI" ? (
          <div className="mt-3">
            <span className={tone === "red" ? "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700" : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"}>
              {value}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
