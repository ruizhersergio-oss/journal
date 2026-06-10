import type { Trade, FundingAccount, Payout } from '@/types/database'

// ─── JSON ─────────────────────────────────────────────────────────────────────

export interface BackupPayload {
  version:   number
  exportedAt: string
  trades:    Trade[]
  accounts:  FundingAccount[]
  payouts:   Payout[]
}

export function downloadJSON(payload: BackupPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerDownload(blob, filename)
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function tradesToCSV(trades: Trade[]): string {
  const headers = [
    'id', 'date', 'time', 'symbol', 'direction',
    'entry_price', 'exit_price', 'sl_price',
    'result', 'pnl', 'rr',
    'confluences', 'dol_type', 'kill_zone',
    'comment', 'notes',
  ]

  const rows = trades.map(t => [
    t.id,
    t.date,
    t.time,
    t.symbol,
    t.direction,
    t.entry_price,
    t.exit_price,
    t.sl_price,
    t.result,
    t.pnl,
    t.rr,
    (t.confluences ?? []).join('; '),
    t.dol_type  ?? '',
    t.kill_zone ?? '',
    csvEscape(t.comment ?? ''),
    csvEscape(t.notes   ?? ''),
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
}

export function downloadCSV(csv: string, filename: string) {
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────

export function backupFilename(type: 'json' | 'csv'): string {
  const now = new Date()
  const ts  = now.toISOString().slice(0, 10)
  return `ruyra-backup-${ts}.${type}`
}
