# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

No test suite is configured.

## Stack

Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS, Supabase (PostgreSQL), Recharts, date-fns, Radix UI primitives, Lucide icons.

Path alias: `@/*` → `src/*`

## Environment

Requires `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Both variables are public (prefixed `NEXT_PUBLIC_`). No user authentication — single-user personal journal.

## Architecture

### Routing & Layout

All routes are client components (`'use client'`). Root `/` redirects to `/dashboard` via `next.config.mjs`. The root layout (`src/app/layout.tsx`) renders a fixed sidebar (`w-56`) and all content is offset with `ml-56`. Desktop-only design — no responsive sidebar.

Main routes: `/dashboard`, `/diario`, `/dol-stats`, `/backtesting`, `/inversion`, `/backups`.

### Data Layer

Direct Supabase JS SDK queries — no ORM. Three tables: `trades`, `funding_accounts`, `payouts`. All pages fetch data in `useEffect` with direct `supabase.from(...)` calls.

The Supabase client is a singleton at `src/lib/supabase.ts`.

### Trade Model & Calculations

Trades have two types: `'real'` and `'backtest'`. Dashboard and Diario only show `trade_type = 'real'`; the Backtesting page shows `'backtest'`.

PnL and RR are **calculated from inputs**, not stored raw — `calcPnl()` and `calcRR()` in `src/lib/calculations.ts` use per-symbol point values (MNQ: $2, NQ: $20, ES: $50, MES: $5) and the `contracts` field.

### Dashboard Metrics

`src/hooks/useMetrics.ts` is the central calculation hook. It receives all trades and returns KPIs plus a `dayMap: Map<date, DayData>` used by the calendar heatmap. Adding a new dashboard metric means extending this hook.

### Multi-Select Confluences

`confluences: IctConfluence[]` on a trade is a multi-value array (not a single enum). The DOL Stats page aggregates across these for win-rate analysis per confluence type.

### Exports

`src/lib/export.ts` handles JSON and CSV downloads. CSV uses a UTF-8 BOM for Excel compatibility. When adding new trade fields, update `tradesToCSV()` here as well.

### Utilities

- `cn()` in `src/lib/utils.ts` — clsx + tailwind-merge for conditional classes
- `formatCurrency`, `formatPercent`, `formatR` — consistent display formatting across all pages
