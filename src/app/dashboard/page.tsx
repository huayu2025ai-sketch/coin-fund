"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Coins,
  Database,
  Flame,
} from "lucide-react";
import {
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
  type Asset,
  type PortfolioTransaction,
  type PriceMap,
  usd,
} from "@/lib/portfolio";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6 lg:p-10 dark:bg-[#0b1120]">
      <div className="mx-auto max-w-7xl">
        {/* ── 顶部栏 ── */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              投资组合
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              成本、仓位与盈亏一屏查看。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 价格聚合条 */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-[#1e293b] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <PricePill icon={Coins} label="BTC" value={usd.format(prices.BTC)} />
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
              <PricePill icon={Flame} label="ETH" value={usd.format(prices.ETH)} />
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
              <PricePill icon={Database} label="SOL" value={usd.format(prices.SOL)} />
            </div>

            {/* 状态 */}
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-400 dark:text-slate-500">{updatedAtText}</span>
              <span
                className={
                  prices.stale
                    ? "ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400"
                    : "ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                }
              >
                {prices.stale ? "价格过期" : "数据正常"}
              </span>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* ── KPI 指标 ── */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="市值" value={usd.format(totals.marketValueUsd)} />
          <MetricCard label="成本基准" value={usd.format(totals.costBasisUsd)} />
          <MetricCard label="总盈亏" value={usd.format(totals.pnlUsd)} tone={totals.pnlUsd >= 0 ? "green" : "red"} />
          <MetricCard label="ROI" value={percent.format(totals.roi)} tone={totals.roi >= 0 ? "green" : "red"} />
          <MetricCard label="原始现金投入" value={usd.format(totals.originalCashUsd)} />
        </div>

        {/* ── 图表 + 表格 ── */}
        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          <div className="ui-card ui-interactive p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">资产分布</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">成本基准 vs 市值</span>
            </div>
            <div className="h-[280px] sm:h-[320px]">
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
                  <CartesianGrid stroke="#f8fafc" vertical={false} />
                  <XAxis axisLine={false} dataKey="asset" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(value) => compactUsd.format(value)} tickLine={false} />
                  <Tooltip formatter={(value) => usd.format(Number(value))} />
                  <Bar dataKey="costBasisUsd" fill="url(#barCost)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="marketValueUsd" fill="url(#barMarket)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card ui-interactive p-6 lg:p-8">
            <h2 className="mb-5 text-sm font-semibold text-slate-900 dark:text-slate-100">持仓明细</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 font-medium">资产</th>
                    <th className="py-2.5 text-right font-medium">数量</th>
                    <th className="py-2.5 text-right font-medium">平均成本</th>
                    <th className="py-2.5 text-right font-medium">价格</th>
                    <th className="py-2.5 text-right font-medium">价值</th>
                    <th className="py-2.5 text-right font-medium">盈亏</th>
                    <th className="py-2.5 text-right font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-800/50 dark:hover:bg-slate-800/40" key={position.asset}>
                      <td className="py-3 font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <AssetBadge asset={position.asset} />
                          {position.asset}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">{position.quantity.toFixed(8)}</td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">{usd.format(position.avgCostUsd)}</td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">{usd.format(position.marketPriceUsd)}</td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100">{usd.format(position.marketValueUsd)}</td>
                      <td className={position.pnlUsd >= 0 ? "py-3 text-right font-medium text-emerald-600 dark:text-emerald-400" : "py-3 text-right font-medium text-red-600 dark:text-red-400"}>
                        {usd.format(position.pnlUsd)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={position.roi >= 0 ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400"}>
                          {percent.format(position.roi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── 新增交易 ── */}
        <div className="ui-card ui-interactive p-6 lg:p-8">
          <TransactionEntryForm />
        </div>
      </div>
    </main>
  );
}

function PricePill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-slate-400 dark:text-slate-500" />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function AssetBadge({ asset }: { asset: Asset }) {
  const styles =
    asset === "BTC"
      ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
      : asset === "ETH"
        ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30"
        : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";

  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${styles}`}>
      {asset.slice(0, 1)}
    </span>
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
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-900 dark:text-slate-100";

  return (
    <div className="ui-card ui-interactive p-5">
      <div className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
