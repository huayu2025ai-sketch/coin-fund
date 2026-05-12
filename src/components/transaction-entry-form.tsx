"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { Asset } from "@/lib/portfolio";

const assets: Asset[] = ["BTC", "ETH", "SOL"];

type FormState = {
  asset: Asset;
  quantity: string;
  priceUsd: string;
  feeUsd: string;
  cashAmountUsd: string;
  executedAt: string;
  note: string;
};

const initialState: FormState = {
  asset: "BTC",
  quantity: "",
  priceUsd: "",
  feeUsd: "0",
  cashAmountUsd: "",
  executedAt: new Date().toISOString().slice(0, 10),
  note: "",
};

export function TransactionEntryForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialState);

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("请先登录再添加交易记录。");
      }

      const quantity = numberOrZero(form.quantity);
      const priceUsd = numberOrZero(form.priceUsd);
      const feeUsd = numberOrZero(form.feeUsd);
      const cashAmountUsd = numberOrZero(form.cashAmountUsd);

      if (quantity <= 0) {
        throw new Error("数量必须大于 0。");
      }

      if (cashAmountUsd <= 0) {
        throw new Error("现金投入必须大于 0。");
      }

      const payload = {
        user_id: user.id,
        kind: "DCA" as const,
        asset: form.asset,
        quantity,
        price_usd: priceUsd,
        fee_usd: feeUsd,
        cash_amount_usd: cashAmountUsd,
        conversion_value_usd: 0,
        source_altcoin_symbol: null,
        source_altcoin_quantity: null,
        source_altcoin_cost_usd: null,
        executed_at: new Date(form.executedAt).toISOString(),
        note: form.note.trim() || null,
      };

      const { error } = await supabase
        .from("portfolio_transactions")
        .insert(payload);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      setForm(initialState);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          新增定投记录
        </h2>
      </div>

      {/* 交易信息 */}
      <div className="grid gap-5">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          交易信息
        </div>
        <div className="grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="资产">
            <select
              className="ui-input h-11 w-full px-4 text-sm"
              value={form.asset}
              onChange={(event) =>
                setForm((value) => ({ ...value, asset: event.target.value as Asset }))
              }
            >
              {assets.map((asset) => (
                <option key={asset}>{asset}</option>
              ))}
            </select>
          </Field>
          <Field label="数量">
            <NumberInput
              value={form.quantity}
              onChange={(quantity) => setForm((value) => ({ ...value, quantity }))}
            />
          </Field>
          <Field label="价格（USD）">
            <NumberInput
              value={form.priceUsd}
              onChange={(priceUsd) => setForm((value) => ({ ...value, priceUsd }))}
            />
          </Field>
          <Field label="手续费（USD）">
            <NumberInput
              value={form.feeUsd}
              onChange={(feeUsd) => setForm((value) => ({ ...value, feeUsd }))}
            />
          </Field>
        </div>
      </div>

      {/* 操作区 */}
      <div className="grid gap-x-5 gap-y-4 border-t border-slate-100 dark:border-slate-800 pt-7 md:grid-cols-[160px_180px_1fr_auto] md:items-end">
        <Field label="现金投入（USD）">
          <NumberInput
            value={form.cashAmountUsd}
            onChange={(cashAmountUsd) =>
              setForm((value) => ({ ...value, cashAmountUsd }))
            }
          />
        </Field>
        <Field label="成交日期">
          <input
            className="ui-input h-12 w-full px-4 text-sm"
            type="date"
            value={form.executedAt}
            onChange={(event) =>
              setForm((value) => ({ ...value, executedAt: event.target.value }))
            }
          />
        </Field>
        <Field label="备注（可选）">
          <input
            className="ui-input h-12 w-full px-4 text-sm"
            placeholder="补充说明..."
            value={form.note}
            onChange={(event) =>
              setForm((value) => ({ ...value, note: event.target.value }))
            }
          />
        </Field>
        <button
          className="ui-btn-primary ui-interactive inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold disabled:opacity-50"
          disabled={mutation.isPending}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          添加记录
        </button>
      </div>

      {/* 错误提示 */}
      {mutation.error ? (
        <div className="rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {mutation.error.message}
        </div>
      ) : null}
    </form>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      className="ui-input h-11 w-full px-4 text-sm"
      inputMode="decimal"
      min="0"
      step="any"
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
