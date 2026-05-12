"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { Asset, TransactionKind } from "@/lib/portfolio";

const assets: Asset[] = ["BTC", "ETH", "SOL"];

type FormState = {
  kind: TransactionKind;
  asset: Asset;
  quantity: string;
  priceUsd: string;
  feeUsd: string;
  cashAmountUsd: string;
  sourceAltcoinSymbol: string;
  sourceAltcoinQuantity: string;
  sourceAltcoinCostUsd: string;
  executedAt: string;
  note: string;
};

const initialState: FormState = {
  kind: "DCA",
  asset: "BTC",
  quantity: "",
  priceUsd: "",
  feeUsd: "0",
  cashAmountUsd: "",
  sourceAltcoinSymbol: "",
  sourceAltcoinQuantity: "",
  sourceAltcoinCostUsd: "",
  executedAt: new Date().toISOString().slice(0, 10),
  note: "",
};

export function TransactionEntryForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialState);

  const conversionValueUsd = useMemo(() => {
    return numberOrZero(form.quantity) * numberOrZero(form.priceUsd);
  }, [form.priceUsd, form.quantity]);

  const conversionRate = useMemo(() => {
    const sourceQuantity = numberOrZero(form.sourceAltcoinQuantity);
    const targetQuantity = numberOrZero(form.quantity);

    return sourceQuantity > 0 && targetQuantity > 0
      ? sourceQuantity / targetQuantity
      : 0;
  }, [form.quantity, form.sourceAltcoinQuantity]);

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
      const sourceAltcoinQuantity = numberOrZero(form.sourceAltcoinQuantity);

      if (quantity <= 0) {
        throw new Error("数量必须大于 0。");
      }

      if (form.kind === "DCA" && cashAmountUsd <= 0) {
        throw new Error("定投模式下，现金投入必须大于 0。");
      }

      if (form.kind === "CONVERSION") {
        if (!form.sourceAltcoinSymbol.trim()) {
          throw new Error("换仓模式下，来源代币符号不能为空。");
        }
        if (sourceAltcoinQuantity <= 0) {
          throw new Error("换仓模式下，来源代币数量必须大于 0。");
        }
        if (conversionValueUsd <= 0) {
          throw new Error("换仓模式下，转换价值必须大于 0。");
        }
      }

      const payload = {
        user_id: user.id,
        kind: form.kind,
        asset: form.asset,
        quantity,
        price_usd: priceUsd,
        fee_usd: feeUsd,
        cash_amount_usd: form.kind === "DCA" ? cashAmountUsd : 0,
        conversion_value_usd:
          form.kind === "CONVERSION" ? conversionValueUsd : 0,
        source_altcoin_symbol:
          form.kind === "CONVERSION"
            ? form.sourceAltcoinSymbol.trim().toUpperCase()
            : null,
        source_altcoin_quantity:
          form.kind === "CONVERSION"
            ? sourceAltcoinQuantity
            : null,
        source_altcoin_cost_usd:
          form.kind === "CONVERSION" && form.sourceAltcoinCostUsd
            ? numberOrZero(form.sourceAltcoinCostUsd)
            : null,
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
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">新增交易</h2>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
          {(["DCA", "CONVERSION"] as TransactionKind[]).map((kind) => (
            <button
              className={
                form.kind === kind
                  ? "rounded-lg bg-white px-4 py-2 font-medium text-slate-900 shadow-sm transition-all duration-200 ease-out"
                  : "rounded-lg px-4 py-2 font-medium text-slate-500 transition-all duration-200 ease-out hover:text-slate-700"
              }
              key={kind}
              type="button"
              onClick={() => setForm((value) => ({ ...value, kind }))}
            >
              {kind === "DCA" ? "定投" : "换仓"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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

      {form.kind === "DCA" ? (
        <Field label="现金投入（USD）">
          <NumberInput
            value={form.cashAmountUsd}
            onChange={(cashAmountUsd) =>
              setForm((value) => ({ ...value, cashAmountUsd }))
            }
          />
        </Field>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <Field label="来源代币符号">
            <input
              className="ui-input h-11 w-full px-4 text-sm uppercase"
              placeholder="ARB"
              value={form.sourceAltcoinSymbol}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  sourceAltcoinSymbol: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="来源代币数量">
            <NumberInput
              value={form.sourceAltcoinQuantity}
              onChange={(sourceAltcoinQuantity) =>
                setForm((value) => ({ ...value, sourceAltcoinQuantity }))
              }
            />
          </Field>
          <Field label="来源代币成本（USD）">
            <NumberInput
              value={form.sourceAltcoinCostUsd}
              onChange={(sourceAltcoinCostUsd) =>
                setForm((value) => ({ ...value, sourceAltcoinCostUsd }))
              }
            />
          </Field>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              {conversionRate.toFixed(6)} 来源代币 / {form.asset}
            </div>
            <div className="mt-0.5 font-medium text-slate-700">${conversionValueUsd.toFixed(2)} 转换价值</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
        <Field label="日期">
          <input
            className="ui-input h-11 w-full px-4 text-sm"
            type="date"
            value={form.executedAt}
            onChange={(event) =>
              setForm((value) => ({ ...value, executedAt: event.target.value }))
            }
          />
        </Field>
        <Field label="备注">
          <input
            className="ui-input h-11 w-full px-4 text-sm"
            value={form.note}
            onChange={(event) =>
              setForm((value) => ({ ...value, note: event.target.value }))
            }
          />
        </Field>
        <button
          className="ui-btn-primary ui-interactive inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-medium disabled:opacity-50"
          disabled={mutation.isPending}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          添加
        </button>
      </div>

      {mutation.error ? (
        <p className="text-sm text-red-600">{mutation.error.message}</p>
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
    <label className="ui-label grid gap-2">
      {label}
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
