-- ============================================================
-- TRADING JOURNAL — Supabase Schema
-- Ejecuta este SQL en tu Supabase SQL Editor
-- ============================================================

-- Tipos enumerados
CREATE TYPE trade_direction AS ENUM ('long', 'short');
CREATE TYPE trade_result    AS ENUM ('win', 'loss', 'BE');
CREATE TYPE trade_symbol    AS ENUM ('MNQ', 'NQ', 'ES', 'MES');
CREATE TYPE kill_zone       AS ENUM ('London', 'NY Open', 'NY AM', 'NY PM');
CREATE TYPE dol_type        AS ENUM (
  'SSL', 'BSL', 'Equal Highs', 'Equal Lows',
  'NY Opening Gap', 'Relative Equal Highs', 'Relative Equal Lows',
  'Data Highs', 'Data Lows'
);
CREATE TYPE account_status  AS ENUM ('activa', 'breached', 'funded');

-- ============================================================
-- TABLA: trades
-- ============================================================
CREATE TABLE trades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,

  date          DATE NOT NULL,
  time          TIME NOT NULL,
  symbol        trade_symbol NOT NULL,
  direction     trade_direction NOT NULL,

  entry_price   NUMERIC(12, 4) NOT NULL,
  exit_price    NUMERIC(12, 4) NOT NULL,
  sl_price      NUMERIC(12, 4) NOT NULL,

  result        trade_result NOT NULL,
  pnl           NUMERIC(12, 2) NOT NULL,
  rr            NUMERIC(8, 3) NOT NULL,

  confluences   TEXT[] DEFAULT '{}',
  dol_type      dol_type,
  kill_zone     kill_zone,

  comment       TEXT,
  notes         TEXT,
  image_url     TEXT
);

-- Índices útiles para el dashboard
CREATE INDEX idx_trades_date       ON trades(date DESC);
CREATE INDEX idx_trades_result     ON trades(result);
CREATE INDEX idx_trades_dol_type   ON trades(dol_type);
CREATE INDEX idx_trades_symbol     ON trades(symbol);

-- ============================================================
-- TABLA: funding_accounts
-- ============================================================
CREATE TABLE funding_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

  name        TEXT NOT NULL,
  prop_firm   TEXT NOT NULL,
  cost        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status      account_status NOT NULL DEFAULT 'activa',
  withdrawn   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes       TEXT
);

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

-- Resumen diario: P&L, nº trades, win rate por día
CREATE VIEW daily_summary AS
SELECT
  date,
  SUM(pnl)                                                  AS daily_pnl,
  COUNT(*)                                                  AS total_trades,
  COUNT(*) FILTER (WHERE result = 'win')                    AS wins,
  COUNT(*) FILTER (WHERE result = 'loss')                   AS losses,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'win')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('win','loss')), 0) * 100,
    1
  )                                                         AS win_rate,
  SUM(rr)                                                   AS total_rr,
  AVG(rr) FILTER (WHERE result = 'win')                     AS avg_win_rr,
  AVG(rr) FILTER (WHERE result = 'loss')                    AS avg_loss_rr
FROM trades
GROUP BY date
ORDER BY date DESC;

-- Win rate por tipo de DOL
CREATE VIEW dol_stats AS
SELECT
  dol_type,
  COUNT(*)                                                  AS total_trades,
  COUNT(*) FILTER (WHERE result = 'win')                    AS wins,
  COUNT(*) FILTER (WHERE result = 'loss')                   AS losses,
  ROUND(
    COUNT(*) FILTER (WHERE result = 'win')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE result IN ('win','loss')), 0) * 100,
    1
  )                                                         AS win_rate,
  AVG(rr) FILTER (WHERE result = 'win')                     AS avg_win_rr
FROM trades
WHERE dol_type IS NOT NULL
GROUP BY dol_type
ORDER BY total_trades DESC;

-- ============================================================
-- ROW LEVEL SECURITY (opcional — actívalo si usas auth)
-- ============================================================
-- ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE funding_accounts ENABLE ROW LEVEL SECURITY;

-- Si no usas auth por ahora, deja acceso público:
-- (Las políticas se configuran desde Supabase > Authentication > Policies)
