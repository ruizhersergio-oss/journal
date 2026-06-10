-- ============================================================
-- INVERSIÓN VS RETORNO — Añadir al schema existente
-- Ejecuta este SQL en tu Supabase SQL Editor
-- ============================================================

-- Nuevo status que incluye 'completada'
CREATE TYPE account_status_v2 AS ENUM ('activa', 'funded', 'breached', 'completada');

-- ============================================================
-- TABLA: funding_accounts (reemplaza la anterior si existe)
-- ============================================================
DROP TABLE IF EXISTS funding_accounts CASCADE;

CREATE TABLE funding_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,

  name          TEXT NOT NULL,
  prop_firm     TEXT NOT NULL,
  cost          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status        account_status_v2 NOT NULL DEFAULT 'activa',
  notes         TEXT
);

CREATE INDEX idx_accounts_status ON funding_accounts(status);
CREATE INDEX idx_accounts_prop_firm ON funding_accounts(prop_firm);

-- ============================================================
-- TABLA: payouts
-- ============================================================
CREATE TABLE payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

  account_id  UUID NOT NULL REFERENCES funding_accounts(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT
);

CREATE INDEX idx_payouts_account ON payouts(account_id);
CREATE INDEX idx_payouts_date    ON payouts(date DESC);

-- ============================================================
-- VISTA: account_summary (cuenta + total payouts)
-- ============================================================
CREATE OR REPLACE VIEW account_summary AS
SELECT
  a.*,
  COALESCE(SUM(p.amount), 0)       AS total_payouts,
  COALESCE(SUM(p.amount), 0) - a.cost AS net_pnl
FROM funding_accounts a
LEFT JOIN payouts p ON p.account_id = a.id
GROUP BY a.id
ORDER BY a.created_at DESC;
