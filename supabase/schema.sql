create extension if not exists pgcrypto;

do $$ begin
  create type public.crypto_asset as enum ('BTC', 'ETH', 'SOL', 'ATOM');
exception
  when duplicate_object then null;
end $$;

alter type public.crypto_asset add value if not exists 'ATOM';

do $$ begin
  create type public.transaction_kind as enum ('DCA', 'CONVERSION');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.transaction_kind not null,
  asset public.crypto_asset not null,
  quantity numeric(28, 12) not null check (quantity > 0),
  price_usd numeric(28, 8) not null check (price_usd >= 0),
  fee_usd numeric(28, 8) not null default 0 check (fee_usd >= 0),
  cash_amount_usd numeric(28, 8) not null default 0 check (cash_amount_usd >= 0),
  conversion_value_usd numeric(28, 8) not null default 0 check (conversion_value_usd >= 0),
  source_altcoin_symbol text,
  source_altcoin_quantity numeric(28, 12),
  source_altcoin_cost_usd numeric(28, 8),
  note text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dca_requires_cash check (
    kind <> 'DCA' or (cash_amount_usd > 0 and conversion_value_usd = 0 and source_altcoin_symbol is null)
  ),
  constraint conversion_requires_source check (
    kind <> 'CONVERSION' or (
      conversion_value_usd > 0
      and cash_amount_usd = 0
      and source_altcoin_symbol is not null
      and source_altcoin_quantity is not null
      and source_altcoin_quantity > 0
    )
  )
);

create index if not exists portfolio_transactions_user_asset_idx
  on public.portfolio_transactions (user_id, asset, executed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_transactions_set_updated_at on public.portfolio_transactions;
create trigger portfolio_transactions_set_updated_at
before update on public.portfolio_transactions
for each row execute function public.set_updated_at();

alter table public.portfolio_transactions enable row level security;

drop policy if exists "portfolio select own rows" on public.portfolio_transactions;
create policy "portfolio select own rows"
on public.portfolio_transactions for select
using (auth.uid() = user_id);

drop policy if exists "portfolio insert own rows" on public.portfolio_transactions;
create policy "portfolio insert own rows"
on public.portfolio_transactions for insert
with check (auth.uid() = user_id);

drop policy if exists "portfolio update own rows" on public.portfolio_transactions;
create policy "portfolio update own rows"
on public.portfolio_transactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "portfolio delete own rows" on public.portfolio_transactions;
create policy "portfolio delete own rows"
on public.portfolio_transactions for delete
using (auth.uid() = user_id);

create or replace view public.portfolio_positions
with (security_invoker = true)
as
select
  user_id,
  asset,
  sum(quantity) as quantity,
  sum((quantity * price_usd) + fee_usd) as cost_basis_usd,
  sum(cash_amount_usd + fee_usd) as original_cash_usd,
  sum(conversion_value_usd) as conversion_value_usd,
  case
    when sum(quantity) = 0 then 0
    else sum((quantity * price_usd) + fee_usd) / sum(quantity)
  end as avg_cost_usd,
  min(executed_at) as first_entry_at,
  max(executed_at) as last_entry_at
from public.portfolio_transactions
group by user_id, asset;
