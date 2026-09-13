-- ============================================================
-- MIGRACIÓN: tabla day_logs — marcar días como revisados aunque
-- no tengan ningún trade asociado (p.ej. "sin operativa" o
-- "backtesteado pero sin trade que registrar").
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

CREATE TYPE day_log_status AS ENUM ('sin_operativa', 'backtest_sin_trade', 'otro');

CREATE TABLE day_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date       DATE NOT NULL,
  symbol     trade_symbol,
  status     day_log_status NOT NULL DEFAULT 'sin_operativa',
  note       TEXT
);

CREATE INDEX idx_day_logs_date ON day_logs(date);
