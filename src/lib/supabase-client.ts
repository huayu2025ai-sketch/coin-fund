"use client";

import { createClient } from "@supabase/supabase-js";
import type { Asset, TransactionKind } from "./portfolio";

type PortfolioTransactionInsert = {
  user_id: string;
  kind: TransactionKind;
  asset: Asset;
  quantity: number;
  price_usd: number;
  fee_usd?: number;
  cash_amount_usd?: number;
  conversion_value_usd?: number;
  source_altcoin_symbol?: string | null;
  source_altcoin_quantity?: number | null;
  source_altcoin_cost_usd?: number | null;
  note?: string | null;
  executed_at?: string;
};

type Database = {
  public: {
    Tables: {
      portfolio_transactions: {
        Row: PortfolioTransactionInsert & {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: PortfolioTransactionInsert;
        Update: Partial<PortfolioTransactionInsert>;
        Relationships: [];
      };
    };
    Views: {
      portfolio_positions: {
        Row: {
          user_id: string;
          asset: Asset;
          quantity: number;
          cost_basis_usd: number;
          original_cash_usd: number;
          conversion_value_usd: number;
          avg_cost_usd: number;
          first_entry_at: string;
          last_entry_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      crypto_asset: Asset;
      transaction_kind: TransactionKind;
    };
    CompositeTypes: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
