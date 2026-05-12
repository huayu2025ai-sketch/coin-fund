# Crypto2028 Portfolio — Agent Guide

## Project Overview

This is a private cryptocurrency portfolio tracker built with Next.js and Supabase. It tracks BTC, ETH, and SOL holdings, supporting two transaction types:

- **DCA (Dollar-Cost Averaging)**: Monthly cash buys with quantity, price, and fee.
- **CONVERSION**: Altcoin-to-major conversions with source token details and computed conversion value.

The UI is entirely in Chinese (zh-CN). All user-facing text, labels, and messages must remain in Chinese.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.24 (App Router) |
| Language | TypeScript 5.7.3 (strict mode) |
| UI | React 18.3.1, Tailwind CSS 3.4.17, Lucide React |
| Data Fetching | TanStack React Query 5.66.9 |
| Charts | Recharts 2.15.1 |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Price API | CoinGecko (via Next.js API route proxy) |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with React Query Providers
│   │   ├── page.tsx            # Landing page (redirects to /dashboard)
│   │   ├── providers.tsx       # QueryClientProvider configuration
│   │   ├── globals.css         # Tailwind directives + custom CSS component classes
│   │   ├── login/page.tsx      # Email/password login page
│   │   ├── dashboard/page.tsx  # Main portfolio dashboard (charts, table, entry form)
│   │   └── api/prices/route.ts # CoinGecko proxy with fallback prices
│   ├── components/
│   │   ├── auth-gate.tsx       # Auth guard: redirects unauthenticated users to /login
│   │   ├── configuration-notice.tsx  # Shown when Supabase env vars are missing
│   │   └── transaction-entry-form.tsx # DCA/Conversion entry form with validation
│   └── lib/
│       ├── supabase-client.ts  # Supabase singleton client with typed Database
│       └── portfolio.ts        # Types, calculations (PnL, ROI, avg cost), formatters
├── supabase/
│   └── schema.sql              # Full DB schema: enums, table, view, triggers, RLS policies
├── next.config.mjs             # Empty Next.js config
├── tailwind.config.ts          # Content paths for src/app, src/components, src/lib
├── postcss.config.mjs          # Tailwind + autoprefixer
├── tsconfig.json               # Strict TypeScript, path alias `@/*` -> `./src/*`
├── run.sh                      # Bash process manager (start/stop/restart/status)
└── .env / .env.example         # Supabase URL and anon key
```

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development server (Next.js dev, port 3000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint (ESLint with next/core-web-vitals)
npm run lint
```

The repository also includes `run.sh`, a custom bash process manager that wraps `npm run dev` with PID tracking and Chinese log output:

```bash
./run.sh start    # Start dev server in background
./run.sh stop     # Stop server
./run.sh restart  # Restart server
./run.sh status   # Check running status
```

## Environment Variables

Required in `.env.local` (or `.env`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The Supabase client is a browser-side singleton. If variables are missing, the app shows `<ConfigurationNotice>` with setup instructions instead of crashing.

## Database Schema

Run `supabase/schema.sql` in the Supabase SQL Editor to initialize:

- **Enums**: `crypto_asset` (BTC, ETH, SOL), `transaction_kind` (DCA, CONVERSION)
- **Table**: `portfolio_transactions` — append-only, with `user_id` FK to `auth.users`
  - RLS enabled: users can only CRUD their own rows
  - Check constraints enforce field presence per `kind`
  - `updated_at` trigger
  - Indexed on `(user_id, asset, executed_at desc)`
- **View**: `portfolio_positions` — aggregated holdings per user/asset with `cost_basis_usd`, `avg_cost_usd`, `original_cash_usd`, `conversion_value_usd`

### Cost Basis Formula

```
cost_basis_usd = sum(quantity * price_usd + fee_usd)
avg_cost_usd   = cost_basis_usd / quantity
```

## Authentication & Security

- **Auth model**: Supabase Auth with email/password (`signInWithPassword`).
- **Route protection**: `<AuthGate>` checks `supabase.auth.getSession()` on mount. Unauthenticated users are redirected to `/login`.
- **Data isolation**: All database access goes through RLS policies tied to `auth.uid()`.
- **No server-side auth checks** in API routes or page RSCs — auth is client-side only in this codebase.

## API Routes

### `GET /api/prices`

Proxies CoinGecko for BTC/ETH/SOL USD prices. Returns:

```json
{
  "BTC": 95000,
  "ETH": 3500,
  "SOL": 180,
  "stale": false,
  "updatedAt": "2026-05-12T14:00:00.000Z"
}
```

If CoinGecko fails, returns zero prices with `stale: true`. The dashboard polls this every 30 seconds.

## State Management & Data Fetching

- **React Query** handles all server state:
  - `["transactions"]` — fetches from `portfolio_transactions`
  - `["prices"]` — fetches from `/api/prices`, refetches every 30s
- **Mutations**: `transaction-entry-form.tsx` uses `useMutation` with `invalidateQueries({ queryKey: ["transactions"] })` on success.
- **Stale time**: 30 seconds default for all queries.

## Code Style and Conventions

- **Strict TypeScript**: `strict: true`, `noEmit: true`, `isolatedModules: true`.
- **Path alias**: Use `@/components/...` and `@/lib/...` instead of relative imports.
- **Client components**: Most interactive pages and components use `"use client"` because they rely on browser APIs (Supabase auth, React Query hooks).
- **Tailwind patterns**: The project uses a set of custom component classes in `globals.css`:
  - `.ui-card`, `.ui-glass`, `.ui-chip`, `.ui-input`, `.ui-btn-primary`, `.ui-interactive`
  - Prefer these over ad-hoc Tailwind classes when building new UI.
- **Formatting utilities**: `usd`, `compactUsd`, `percent` formatters from `@/lib/portfolio`.
- **Language**: UI text must be in Chinese. Code (variables, types, filenames) remains in English.

## Testing

There is currently **no test framework** configured. The project has no unit tests, integration tests, or E2E tests. If adding tests, Jest/Vitest + React Testing Library would be the natural fit.

## Deployment Notes

- This is a standard Next.js application. Deploy to Vercel, or any platform supporting Next.js.
- **Required pre-deploy step**: Initialize the Supabase project and run `supabase/schema.sql`.
- Environment variables must be set at build time because `NEXT_PUBLIC_*` vars are inlined.
- The app has no CI/CD configuration files (no `.github/workflows`, no Docker).

## Common Tasks for Agents

### Adding a new asset
1. Update `crypto_asset` enum in `supabase/schema.sql`.
2. Add the asset to the `Asset` type and `assets` array in `src/lib/portfolio.ts`.
3. Update `src/app/api/prices/route.ts` CoinGecko URL and mapping.
4. Update dashboard UI labels.

### Adding a new chart or metric
- Use `recharts` (already imported in dashboard).
- Derive data in `dashboard/page.tsx` with `useMemo`.
- Format currency with `usd` or `compactUsd`, percentages with `percent`.

### Changing auth behavior
- Modify `src/components/auth-gate.tsx` for route guard logic.
- Modify `src/app/login/page.tsx` for login UI and sign-in method.
- Remember: RLS in Supabase is the true security boundary.

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/lib/portfolio.ts` | All business logic: types, position calculations, totals, formatters |
| `src/lib/supabase-client.ts` | Typed Supabase client singleton + config check |
| `src/app/dashboard/page.tsx` | Main UI: metrics, bar chart, area chart, position table, entry form |
| `src/components/transaction-entry-form.tsx` | Form validation and insert mutation for transactions |
| `supabase/schema.sql` | Source of truth for database structure |
