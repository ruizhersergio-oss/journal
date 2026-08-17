-- ============================================================
-- MIGRACIÓN: target_type — "VAL/VAH sesión actual" -> "VAL/VAH diario" + "VAL/VAH RTH"
-- Ejecutar en el SQL Editor de Supabase, en orden, en una sola transacción.
-- ============================================================

BEGIN;

-- 0) Quitar la vista dol_stats primero (depende de la columna target).
DROP VIEW IF EXISTS dol_stats;

-- 1) Crear el nuevo enum con los valores actualizados.
CREATE TYPE target_type_new AS ENUM (
  'Big Trade Comprador', 'Big Trade Vendedor', 'Big Trade',
  'VAL diario', 'VAL RTH', 'VAL día anterior', 'VAL horario', 'VAL semanal', 'VAL mensual',
  'VAH diario', 'VAH RTH', 'VAH día anterior', 'VAH horario', 'VAH semanal', 'VAH mensual',
  'POC horario', 'POC diario', 'POC semanal', 'POC mensual',
  'VWAP ETH', 'VWAP RTH', 'VWAP día anterior', 'VWAP semanal', 'VWAP mensual',
  'IB High 30min', 'IB High 1h', 'IB Low 30min', 'IB Low 1h',
  'HVN', 'LVN'
);

-- 2) Convertir la columna, mapeando "sesión actual" -> "diario"
--    (decisión: los trades viejos de VAL/VAH "sesión actual" pasan a "diario";
--    si preferías mapearlos a "RTH" en su lugar, ajusta el CASE antes de correr esto).
ALTER TABLE trades
  ALTER COLUMN target TYPE target_type_new
  USING (
    CASE target::text
      WHEN 'VAL sesión actual' THEN 'VAL diario'
      WHEN 'VAH sesión actual' THEN 'VAH diario'
      ELSE target::text
    END
  )::target_type_new;

-- 3) Reemplazar el tipo enum viejo.
DROP TYPE target_type;
ALTER TYPE target_type_new RENAME TO target_type;

-- 4) Recrear la vista dol_stats.
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
