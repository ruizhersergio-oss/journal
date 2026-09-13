-- ============================================================
-- MIGRACIÓN: añadir "NDOG", "NWOG", "NMOG" al enum target_type
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

ALTER TYPE target_type ADD VALUE IF NOT EXISTS 'NDOG';
ALTER TYPE target_type ADD VALUE IF NOT EXISTS 'NWOG';
ALTER TYPE target_type ADD VALUE IF NOT EXISTS 'NMOG';
