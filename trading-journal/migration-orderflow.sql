-- ============================================================
-- MIGRACIÓN: ICT -> Order Flow / Volume Profile
-- Ejecutar en el SQL Editor de Supabase, en orden, en una sola transacción.
-- ============================================================

BEGIN;

-- ============================================================
-- 0) Quitar la vista dol_stats primero.
--    Depende de dol_type/target — si no se quita ahora, el ALTER COLUMN
--    de más abajo falla porque la vista queda enganchada a la columna.
-- ============================================================

DROP VIEW IF EXISTS dol_stats;

-- ============================================================
-- A) KILL ZONE — nuevos valores: London | NY | Asia | Oceania
-- ============================================================

CREATE TYPE kill_zone_new AS ENUM ('London', 'NY', 'Asia', 'Oceania');

ALTER TABLE trades
  ALTER COLUMN kill_zone TYPE kill_zone_new
  USING (
    CASE kill_zone::text
      WHEN 'London'  THEN 'London'
      WHEN 'NY Open' THEN 'NY'
      WHEN 'NY AM'   THEN 'NY'
      WHEN 'NY PM'   THEN 'NY'
      ELSE NULL
    END
  )::kill_zone_new;

DROP TYPE kill_zone;
ALTER TYPE kill_zone_new RENAME TO kill_zone;

-- ============================================================
-- B) DOL_TYPE -> TARGET — renombrar columna + nuevo enum Order Flow / Volume Profile
-- ============================================================

-- 1. Renombrar la columna (conserva los datos)
ALTER TABLE trades RENAME COLUMN dol_type TO target;

-- 2. Crear el nuevo enum con los valores Order Flow / Volume Profile
CREATE TYPE target_type_new AS ENUM (
  'Big Trade Comprador', 'Big Trade Vendedor', 'Big Trade',
  'VAL sesión actual', 'VAL día anterior', 'VAL horario', 'VAL semanal', 'VAL mensual',
  'VAH sesión actual', 'VAH día anterior', 'VAH horario', 'VAH semanal', 'VAH mensual',
  'POC horario', 'POC diario', 'POC semanal', 'POC mensual',
  'VWAP ETH', 'VWAP RTH', 'VWAP día anterior', 'VWAP semanal', 'VWAP mensual',
  'IB High 30min', 'IB High 1h', 'IB Low 30min', 'IB Low 1h',
  'HVN', 'LVN'
);

-- 3. Convertir la columna, mapeando los valores existentes.
--    Todos los valores presentes en producción están cubiertos explícitamente
--    (confirmado por consulta directa: LVN, POC Diario, SSL, VAH, null).
ALTER TABLE trades
  ALTER COLUMN target TYPE target_type_new
  USING (
    CASE target::text
      WHEN 'POC Diario' THEN 'POC diario'
      WHEN 'LVN'         THEN 'LVN'
      WHEN 'HVN'          THEN 'HVN'
      WHEN 'SSL'          THEN NULL   -- decidido: sin equivalente en la lista nueva
      WHEN 'VAH'          THEN NULL   -- decidido: sin decorar (horario/diario/semanal)
      ELSE NULL
    END
  )::target_type_new;

-- 4. Reemplazar el tipo enum viejo
DROP TYPE dol_type;
ALTER TYPE target_type_new RENAME TO target_type;

-- 5. Actualizar índice
DROP INDEX IF EXISTS idx_trades_dol_type;
CREATE INDEX idx_trades_target ON trades(target);

-- ============================================================
-- C) CUSTOM_CONFLUENCES — tags libres para Order Flow
-- ============================================================

CREATE TABLE custom_confluences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- D) Recrear la vista dol_stats usando target en vez de dol_type
-- ============================================================

CREATE VIEW dol_stats AS
SELECT
  target,
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
WHERE target IS NOT NULL
GROUP BY target
ORDER BY total_trades DESC;

COMMIT;
