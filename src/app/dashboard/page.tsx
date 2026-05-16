"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ChevronDown,
  Coins,
  Database,
  Flame,
  Orbit,
  Trash2,
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
import { SwitchUserButton } from "@/components/switch-user-button";

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

async function fetchCurrentUserId() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const [createCollapsed, setCreateCollapsed] = useState(true);
  const [queryCollapsed, setQueryCollapsed] = useState(true);
  const userQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: fetchCurrentUserId,
  });
  const currentUserId = userQuery.data ?? null;

  const transactionsQuery = useQuery({
    queryKey: ["transactions", currentUserId],
    queryFn: fetchTransactions,
    enabled: Boolean(currentUserId),
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
        ATOM: 0,
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
  const visiblePositions = useMemo(
    () => positions.filter((position) => position.quantity > 0),
    [positions],
  );
  const visibleTablePositions = useMemo(() => {
    const tradedAssets = new Set(transactions.map((transaction) => transaction.asset));
    return positions.filter(
      (position) => position.quantity > 0 || tradedAssets.has(position.asset),
    );
  }, [positions, transactions]);
  const totals = useMemo(() => calculateTotals(positions), [positions]);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("portfolio_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions", currentUserId] });
    },
  });

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-10 dark:bg-[#0b1120]">
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
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
              <PricePill icon={Orbit} label="ATOM" value={usd.format(prices.ATOM)} />
            </div>

            {/* 状态 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Activity className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:inline">{updatedAtText}</span>
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
            <SwitchUserButton />
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
            <div className="h-[240px] sm:h-[280px] lg:h-[320px]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={visiblePositions}>
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
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-[#1e293b]">
                          <div className="mb-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {label}
                          </div>
                          {payload.map((entry) => (
                            <div key={entry.dataKey} className="flex items-center gap-2 py-0.5 text-sm">
                              <span
                                className="h-2.5 w-2.5 rounded-sm"
                                style={{ background: entry.color }}
                              />
                              <span className="text-slate-500 dark:text-slate-400">
                                {entry.dataKey === "costBasisUsd" ? "成本基准" : "市值"}
                              </span>
                              <span className="ml-auto font-medium text-slate-900 dark:text-slate-100">
                                {usd.format(Number(entry.value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                    cursor={{ fill: "rgba(148,163,184,0.06)" }}
                  />
                  <Bar dataKey="costBasisUsd" fill="url(#barCost)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="marketValueUsd" fill="url(#barMarket)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card ui-interactive p-6 lg:p-8">
            <h2 className="mb-5 text-sm font-semibold text-slate-900 dark:text-slate-100">持仓明细</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="w-20 py-2.5 font-medium whitespace-nowrap">资产</th>
                    <th className="py-2.5 text-right font-medium">数量</th>
                    <th className="py-2.5 text-right font-medium">平均成本</th>
                    <th className="py-2.5 text-right font-medium">价格</th>
                    <th className="py-2.5 text-right font-medium">价值</th>
                    <th className="py-2.5 text-right font-medium">盈亏</th>
                    <th className="py-2.5 text-right font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTablePositions.map((position) => (
                    <tr className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-800/50 dark:hover:bg-slate-800/40" key={position.asset}>
                      <td className="w-20 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
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
              {visibleTablePositions.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  暂无持仓数据
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 新增交易 ── */}
        <div className="ui-card ui-interactive p-6 lg:p-8">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setCreateCollapsed((value) => !value)}
            type="button"
          >
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">新增交易</h2>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-150 ease-out dark:text-slate-500 ${createCollapsed ? "" : "rotate-180"}`}
            />
          </button>
          {!createCollapsed ? <TransactionEntryForm /> : null}
        </div>

        {/* ── 交易记录 ── */}
        <div className="ui-card ui-interactive p-6 lg:p-8">
          <button
            className="mb-5 flex w-full items-center justify-between text-left"
            onClick={() => setQueryCollapsed((value) => !value)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">交易记录</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">共 {transactions.length} 条</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-150 ease-out dark:text-slate-500 ${queryCollapsed ? "" : "rotate-180"}`}
            />
          </button>

          {queryCollapsed ? null : transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              暂无交易记录，请在上方添加。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 font-medium">日期</th>
                    <th className="py-2.5 font-medium">资产</th>
                    <th className="py-2.5 text-right font-medium">数量</th>
                    <th className="py-2.5 text-right font-medium">价格</th>
                    <th className="py-2.5 text-right font-medium">手续费</th>
                    <th className="py-2.5 text-right font-medium">现金投入</th>
                    <th className="py-2.5 font-medium">备注</th>
                    <th className="py-2.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-800/50 dark:hover:bg-slate-800/40"
                      key={tx.id}
                    >
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {new Date(tx.executed_at).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="py-3 font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <AssetBadge asset={tx.asset} />
                          {tx.asset}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                        {tx.quantity.toFixed(8)}
                      </td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                        {usd.format(tx.price_usd)}
                      </td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-400">
                        {usd.format(tx.fee_usd)}
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {usd.format(tx.cash_amount_usd)}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {tx.note || "—"}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          disabled={deleteMutation.isPending}
                          title="删除"
                          onClick={() => {
                            if (confirm("确定删除这条交易记录？")) {
                              deleteMutation.mutate(tx.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        : asset === "ATOM"
          ? "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/30"
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
