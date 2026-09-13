-- ============================================================
-- FIX: day_logs se creó con Row Level Security activado y sin
-- políticas, lo que bloqueaba silenciosamente cualquier insert
-- (error 42501 "new row violates row-level security policy").
-- El resto de tablas (trades, funding_accounts, etc.) no usan RLS
-- porque la app es de un único usuario sin autenticación — se
-- iguala aquí el mismo comportamiento.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

ALTER TABLE day_logs DISABLE ROW LEVEL SECURITY;
