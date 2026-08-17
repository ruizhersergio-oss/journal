-- ============================================================
-- MIGRACIÓN: añadir "TPO" al enum target_type
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

ALTER TYPE target_type ADD VALUE IF NOT EXISTS 'TPO';
