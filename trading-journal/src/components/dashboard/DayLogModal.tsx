'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { FormField, Select, Textarea } from '@/components/ui/FormField'
import type { DayLog, DayLogStatus, Symbol } from '@/types/database'
import { DAY_LOG_STATUSES, DAY_LOG_STATUS_LABELS } from '@/types/database'

const DAY_LOG_SYMBOLS: Symbol[] = ['NQ', 'ES']

interface DayLogModalProps {
  date:          string
  existingLogs:  DayLog[]
  defaultStatus?: DayLogStatus
  onClose:       () => void
  onSaved:       () => void
}

export default function DayLogModal({ date, existingLogs, defaultStatus = 'sin_operativa', onClose, onSaved }: DayLogModalProps) {
  const [status, setStatus]   = useState<DayLogStatus>(defaultStatus)
  const [symbol, setSymbol]   = useState<Symbol | ''>('')
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setErrorMsg(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('day_logs') as any
    const { error } = await table.insert({
      date,
      symbol: symbol || null,
      status,
      note: note.trim() || null,
    })
    setSaving(false)
    if (error) {
      setErrorMsg(error.message)
    } else {
      setStatus(defaultStatus)
      setSymbol('')
      setNote('')
      onSaved()
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setErrorMsg(null)
    const { error } = await supabase.from('day_logs').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      setErrorMsg(error.message)
    } else {
      onSaved()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[#e8eaf0] text-sm font-semibold">Marcar día como revisado</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">
              {format(parseISO(date), 'dd MMM yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1f2230] text-[#6b7280] hover:text-[#e8eaf0] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {existingLogs.length > 0 && (
          <div className="space-y-2">
            {existingLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-2 bg-[#13151c] border border-[#2a2d3a] rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[#e8eaf0] text-xs font-medium">
                    {DAY_LOG_STATUS_LABELS[log.status]}
                    {log.symbol && <span className="text-[#6b7280]"> · {log.symbol}</span>}
                  </p>
                  {log.note && (
                    <p className="text-[#6b7280] text-xs mt-0.5 break-words">{log.note}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                  className="p-1 rounded text-[#6b7280] hover:text-[#fc5c65] transition-colors shrink-0 disabled:opacity-50"
                  title="Eliminar"
                >
                  {deletingId === log.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Estado">
            <Select value={status} onChange={(e) => setStatus(e.target.value as DayLogStatus)}>
              {DAY_LOG_STATUSES.map((s) => (
                <option key={s} value={s}>{DAY_LOG_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Símbolo (opcional)">
            <Select value={symbol} onChange={(e) => setSymbol(e.target.value as Symbol | '')}>
              <option value="">Todos</option>
              {DAY_LOG_SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="Nota (opcional)">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: sin setups válidos, solo repaso de gráfico..."
          />
        </FormField>

        {errorMsg && (
          <p className="text-[#fc5c65] text-xs">{errorMsg}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-[#4f8ef7] hover:bg-[#3f7ee0] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Guardar
        </button>
      </div>
    </div>,
    document.body
  )
}
