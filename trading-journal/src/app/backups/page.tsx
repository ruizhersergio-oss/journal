'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Download, Upload, Database, FileJson, FileText,
  CheckCircle, AlertTriangle, Loader2, RefreshCw, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import {
  downloadJSON, downloadCSV, tradesToCSV,
  backupFilename, type BackupPayload,
} from '@/lib/export'
import type { Trade, FundingAccount, Payout } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupRecord {
  id:           string
  type:         'json' | 'csv'
  filename:     string
  date:         string
  tradeCount:   number
  accountCount: number
}

interface DbStats {
  tradeCount:   number
  accountCount: number
  payoutCount:  number
  oldestTrade:  string | null
  newestTrade:  string | null
  totalPnl:     number
}

interface ImportPreview {
  trades:   number
  accounts: number
  payouts:  number
  payload:  BackupPayload
}

const LS_KEY = 'ruyra_backup_history'

function loadHistory(): BackupRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch { return [] }
}

function saveHistory(records: BackupRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(records.slice(0, 20)))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BackupsPage() {
  const [stats,          setStats]          = useState<DbStats | null>(null)
  const [statsLoading,   setStatsLoading]   = useState(true)
  const [exporting,      setExporting]      = useState<'json' | 'csv' | null>(null)
  const [history,        setHistory]        = useState<BackupRecord[]>([])
  const [importPreview,  setImportPreview]  = useState<ImportPreview | null>(null)
  const [importError,    setImportError]    = useState<string | null>(null)
  const [importLoading,  setImportLoading]  = useState(false)
  const [importSuccess,  setImportSuccess]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    const [tradesRes, accountsRes, payoutsRes] = await Promise.all([
      supabase.from('trades').select('date, pnl', { count: 'exact' }),
      supabase.from('funding_accounts').select('id', { count: 'exact' }),
      supabase.from('payouts').select('id', { count: 'exact' }),
    ])

    const trades   = (tradesRes.data  ?? []) as { date: string; pnl: number }[]
    const dates    = trades.map(t => t.date).sort()
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)

    setStats({
      tradeCount:   tradesRes.count  ?? 0,
      accountCount: accountsRes.count ?? 0,
      payoutCount:  payoutsRes.count  ?? 0,
      oldestTrade:  dates[0]          ?? null,
      newestTrade:  dates[dates.length - 1] ?? null,
      totalPnl,
    })
    setStatsLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Fetch all data ──────────────────────────────────────────────────────────
  async function fetchAllData(): Promise<BackupPayload | null> {
    const [tradesRes, accountsRes, payoutsRes] = await Promise.all([
      supabase.from('trades').select('*').order('date'),
      supabase.from('funding_accounts').select('*').order('created_at'),
      supabase.from('payouts').select('*').order('date'),
    ])
    if (tradesRes.error || accountsRes.error || payoutsRes.error) return null

    return {
      version:    1,
      exportedAt: new Date().toISOString(),
      trades:     (tradesRes.data   ?? []) as Trade[],
      accounts:   (accountsRes.data ?? []) as FundingAccount[],
      payouts:    (payoutsRes.data  ?? []) as Payout[],
    }
  }

  function addToHistory(record: Omit<BackupRecord, 'id'>) {
    const entry = { ...record, id: crypto.randomUUID() }
    const updated = [entry, ...history]
    setHistory(updated)
    saveHistory(updated)
  }

  // ── Export JSON ─────────────────────────────────────────────────────────────
  async function handleExportJSON() {
    setExporting('json')
    const payload = await fetchAllData()
    if (!payload) { setExporting(null); return }

    const filename = backupFilename('json')
    downloadJSON(payload, filename)
    addToHistory({
      type:         'json',
      filename,
      date:         new Date().toISOString(),
      tradeCount:   payload.trades.length,
      accountCount: payload.accounts.length,
    })
    setExporting(null)
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  async function handleExportCSV() {
    setExporting('csv')
    const payload = await fetchAllData()
    if (!payload) { setExporting(null); return }

    const filename = backupFilename('csv')
    downloadCSV(tradesToCSV(payload.trades), filename)
    addToHistory({
      type:         'csv',
      filename,
      date:         new Date().toISOString(),
      tradeCount:   payload.trades.length,
      accountCount: 0,
    })
    setExporting(null)
  }

  // ── Re-download (fresh fetch of same type) ─────────────────────────────────
  async function handleRedownload(type: 'json' | 'csv') {
    if (type === 'json') await handleExportJSON()
    else                  await handleExportCSV()
  }

  // ── Import: parse file ──────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportPreview(null)
    setImportSuccess(null)

    try {
      const text    = await file.text()
      const parsed  = JSON.parse(text) as BackupPayload

      if (!parsed.trades || !Array.isArray(parsed.trades)) {
        throw new Error('Archivo inválido: no se encontró el campo "trades".')
      }

      setImportPreview({
        trades:   parsed.trades.length,
        accounts: (parsed.accounts ?? []).length,
        payouts:  (parsed.payouts  ?? []).length,
        payload:  parsed,
      })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al leer el archivo.')
    }

    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Import: confirm ─────────────────────────────────────────────────────────
  async function handleImportConfirm() {
    if (!importPreview) return
    setImportLoading(true)
    setImportError(null)

    const { trades, accounts, payouts, payload } = importPreview

    // Upsert trades
    if (payload.trades.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('trades') as any)
        .upsert(payload.trades, { onConflict: 'id', ignoreDuplicates: true })
      if (error) { setImportError(`Error importando trades: ${error.message}`); setImportLoading(false); return }
    }

    // Upsert accounts
    if ((payload.accounts ?? []).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('funding_accounts') as any)
        .upsert(payload.accounts, { onConflict: 'id', ignoreDuplicates: true })
      if (error) { setImportError(`Error importando cuentas: ${error.message}`); setImportLoading(false); return }
    }

    // Upsert payouts
    if ((payload.payouts ?? []).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('payouts') as any)
        .upsert(payload.payouts, { onConflict: 'id', ignoreDuplicates: true })
      if (error) { setImportError(`Error importando payouts: ${error.message}`); setImportLoading(false); return }
    }

    setImportSuccess(
      `Importación completada: ${trades} trades, ${accounts} cuentas, ${payouts} payouts procesados.`
    )
    setImportPreview(null)
    setImportLoading(false)
    fetchStats()
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[#e8eaf0] text-xl font-bold">Backups</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Exporta, importa y consulta el estado de tu base de datos
        </p>
      </div>

      {/* ── DB stats ── */}
      <DbStatsCard stats={stats} loading={statsLoading} onRefresh={fetchStats} />

      {/* ── Manual export ── */}
      <Section
        icon={<Download size={16} />}
        title="Backup manual"
        description="Descarga todos tus datos en el formato que prefieras"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExportCard
            icon={<FileJson size={24} />}
            title="Exportar JSON"
            description="Trades + cuentas + payouts. Úsalo para restaurar o migrar."
            actionLabel="Descargar JSON"
            loading={exporting === 'json'}
            color="blue"
            onClick={handleExportJSON}
          />
          <ExportCard
            icon={<FileText size={24} />}
            title="Exportar CSV"
            description="Solo trades, compatible con Excel y Google Sheets."
            actionLabel="Descargar CSV"
            loading={exporting === 'csv'}
            color="green"
            onClick={handleExportCSV}
          />
        </div>

        {/* Last backup */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6b7280]">
            <Clock size={12} />
            Último backup:{' '}
            <span className="text-[#9ca3af]">
              {format(parseISO(history[0].date), "dd MMM yyyy 'a las' HH:mm")}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#2a2d3a] uppercase font-mono">
              {history[0].type}
            </span>
          </div>
        )}
      </Section>

      {/* ── Backup history ── */}
      {history.length > 0 && (
        <Section
          icon={<Clock size={16} />}
          title="Historial de backups"
          description="Backups realizados en esta sesión (máx. 20)"
        >
          <div className="space-y-2">
            {history.map(rec => (
              <div
                key={rec.id}
                className="flex items-center justify-between py-3 px-4 bg-[#13151c] border border-[#2a2d3a] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {rec.type === 'json'
                    ? <FileJson size={16} className="text-[#4f8ef7] shrink-0" />
                    : <FileText size={16} className="text-[#26de81] shrink-0" />
                  }
                  <div>
                    <p className="text-[#e8eaf0] text-xs font-mono">{rec.filename}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">
                      {format(parseISO(rec.date), "dd MMM yyyy · HH:mm")}
                      {' · '}
                      {rec.tradeCount} trade{rec.tradeCount !== 1 ? 's' : ''}
                      {rec.type === 'json' && ` · ${rec.accountCount} cuenta${rec.accountCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRedownload(rec.type)}
                  disabled={exporting !== null}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    rec.type === 'json'
                      ? 'border-[#4f8ef7]/30 text-[#4f8ef7] hover:bg-[#4f8ef7]/10'
                      : 'border-[#26de81]/30 text-[#26de81] hover:bg-[#26de81]/10',
                    exporting !== null && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Download size={12} />
                  Re-descargar
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Import ── */}
      <Section
        icon={<Upload size={16} />}
        title="Importar backup"
        description="Restaura datos desde un archivo JSON de backup previo"
      >
        {/* Warning */}
        <div className="flex items-start gap-3 px-4 py-3 bg-[#f7c948]/5 border border-[#f7c948]/20 rounded-lg">
          <AlertTriangle size={16} className="text-[#f7c948] shrink-0 mt-0.5" />
          <p className="text-[#f7c948] text-xs leading-relaxed">
            La importación <strong>no borra datos existentes</strong>. Solo añade registros nuevos.
            Si un ID ya existe en la base de datos, ese registro se ignora (sin duplicados).
          </p>
        </div>

        {/* File drop zone */}
        {!importPreview && (
          <label className={cn(
            'flex flex-col items-center justify-center gap-3 w-full py-10',
            'border-2 border-dashed border-[#2a2d3a] rounded-xl cursor-pointer',
            'hover:border-[#4f8ef7]/50 hover:bg-[#4f8ef7]/3 transition-colors',
          )}>
            <Upload size={24} className="text-[#4b5563]" />
            <div className="text-center">
              <p className="text-[#e8eaf0] text-sm font-medium">
                Selecciona un archivo JSON de backup
              </p>
              <p className="text-[#6b7280] text-xs mt-1">
                Solo archivos .json generados por esta app
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}

        {/* Error */}
        {importError && (
          <div className="flex items-start gap-3 px-4 py-3 bg-[#fc5c65]/5 border border-[#fc5c65]/20 rounded-lg">
            <AlertTriangle size={16} className="text-[#fc5c65] shrink-0 mt-0.5" />
            <p className="text-[#fc5c65] text-xs">{importError}</p>
          </div>
        )}

        {/* Success */}
        {importSuccess && (
          <div className="flex items-start gap-3 px-4 py-3 bg-[#26de81]/5 border border-[#26de81]/20 rounded-lg">
            <CheckCircle size={16} className="text-[#26de81] shrink-0 mt-0.5" />
            <p className="text-[#26de81] text-xs">{importSuccess}</p>
          </div>
        )}

        {/* Preview */}
        {importPreview && (
          <div className="space-y-4">
            <div className="bg-[#13151c] border border-[#2a2d3a] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#26de81]" />
                <p className="text-[#e8eaf0] text-sm font-semibold">Archivo válido — preview</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <PreviewStat label="Trades" value={importPreview.trades} color="text-[#4f8ef7]" />
                <PreviewStat label="Cuentas" value={importPreview.accounts} color="text-[#26de81]" />
                <PreviewStat label="Payouts" value={importPreview.payouts} color="text-[#f7c948]" />
              </div>

              {importPreview.payload.exportedAt && (
                <p className="text-[#6b7280] text-xs">
                  Generado el{' '}
                  {format(parseISO(importPreview.payload.exportedAt), "dd MMM yyyy 'a las' HH:mm")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setImportPreview(null); setImportError(null) }}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#e8eaf0] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importLoading}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold',
                  'bg-[#4f8ef7] hover:bg-[#3d7de6] text-white transition-colors',
                  importLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                {importLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar importación
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

// ─── DB Stats card ─────────────────────────────────────────────────────────────

function DbStatsCard({ stats, loading, onRefresh }: {
  stats:     DbStats | null
  loading:   boolean
  onRefresh: () => void
}) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[#4f8ef7]" />
          <h3 className="text-[#e8eaf0] font-semibold text-sm">Estado de la base de datos</h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#1f2230] transition-colors disabled:opacity-40"
          title="Actualizar"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-[#13151c] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCell label="Trades" value={String(stats.tradeCount)} />
          <StatCell label="Cuentas" value={String(stats.accountCount)} />
          <StatCell label="Payouts" value={String(stats.payoutCount)} />
          <StatCell
            label="P&L total"
            value={`${stats.totalPnl >= 0 ? '+' : ''}${formatCurrency(stats.totalPnl)}`}
            valueColor={stats.totalPnl > 0 ? 'text-[#26de81]' : stats.totalPnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'}
          />
          <div className="bg-[#13151c] rounded-lg px-3 py-3">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wider">Rango fechas</p>
            {stats.oldestTrade ? (
              <>
                <p className="text-[#e8eaf0] text-xs font-medium mt-1">
                  {stats.oldestTrade}
                </p>
                <p className="text-[#4b5563] text-[10px]">→ {stats.newestTrade}</p>
              </>
            ) : (
              <p className="text-[#4b5563] text-xs mt-1">Sin datos</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[#6b7280] text-sm">No se pudieron cargar las estadísticas.</p>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon, title, description, children,
}: {
  icon:        React.ReactNode
  title:       string
  description: string
  children:    React.ReactNode
}) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3a]">
        <span className="text-[#4f8ef7]">{icon}</span>
        <div>
          <h3 className="text-[#e8eaf0] font-semibold text-sm">{title}</h3>
          <p className="text-[#6b7280] text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function ExportCard({
  icon, title, description, actionLabel, loading, color, onClick,
}: {
  icon:        React.ReactNode
  title:       string
  description: string
  actionLabel: string
  loading:     boolean
  color:       'blue' | 'green'
  onClick:     () => void
}) {
  const palette = color === 'blue'
    ? { border: 'border-[#4f8ef7]/20', icon: 'text-[#4f8ef7]', btn: 'bg-[#4f8ef7]/10 text-[#4f8ef7] hover:bg-[#4f8ef7]/20 border-[#4f8ef7]/30' }
    : { border: 'border-[#26de81]/20', icon: 'text-[#26de81]', btn: 'bg-[#26de81]/10 text-[#26de81] hover:bg-[#26de81]/20 border-[#26de81]/30' }

  return (
    <div className={cn(
      'bg-[#13151c] border rounded-xl p-5 flex flex-col gap-4',
      palette.border
    )}>
      <div className="flex items-start gap-3">
        <span className={palette.icon}>{icon}</span>
        <div>
          <p className="text-[#e8eaf0] text-sm font-semibold">{title}</p>
          <p className="text-[#6b7280] text-xs mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-semibold border transition-colors',
          palette.btn,
          loading && 'opacity-60 cursor-not-allowed'
        )}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <Download size={14} />
        }
        {loading ? 'Preparando...' : actionLabel}
      </button>
    </div>
  )
}

function StatCell({ label, value, valueColor }: {
  label:       string
  value:       string
  valueColor?: string
}) {
  return (
    <div className="bg-[#13151c] rounded-lg px-3 py-3">
      <p className="text-[#6b7280] text-[10px] uppercase tracking-wider">{label}</p>
      <p className={cn('text-lg font-bold mt-1', valueColor ?? 'text-[#e8eaf0]')}>{value}</p>
    </div>
  )
}

function PreviewStat({ label, value, color }: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg px-4 py-3 text-center">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-[#6b7280] text-xs mt-0.5">{label}</p>
    </div>
  )
}
