'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Upload, X, Loader2, Calculator } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcRR, calcPnl } from '@/lib/calculations'
import { cn, formatCurrency } from '@/lib/utils'
import { FormField, Input, Textarea, Select } from '@/components/ui/FormField'
import type {
  Trade, Symbol, TradeDirection, TradeResult,
  KillZone, DolType, IctConfluence,
} from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMBOLS: Symbol[]      = ['MNQ', 'NQ', 'ES', 'MES']
const KILL_ZONES: KillZone[] = ['London', 'NY Open', 'NY AM', 'NY PM']

const DOL_GROUPS: { label: string; options: DolType[] }[] = [
  {
    label: 'ICT / Liquidez',
    options: [
      'SSL', 'BSL', 'Equal Highs', 'Equal Lows',
      'NY Opening Gap', 'Relative Equal Highs', 'Relative Equal Lows',
      'Data Highs', 'Data Lows',
    ],
  },
  {
    label: 'Volume Profile',
    options: ['POC Diario', 'POC Semanal', 'VAH', 'VAL', 'HVN', 'LVN'],
  },
]

const CONFLUENCE_GROUPS: { label: string; items: IctConfluence[] }[] = [
  {
    label: 'ICT',
    items: ['FVG', 'OB', 'MSS', 'SSL sweep', 'BSL sweep', 'Judas Swing', 'AMD', 'CISD', 'Protected Swing', 'VWAP', 'otros'],
  },
  {
    label: 'Order Flow',
    items: ['Absorción', 'Order Flow Delta', 'Imbalance (Bid/Ask)', 'Stacked Imbalances', 'Delta Divergence', 'Iceberg Order', 'Exhaustion', 'Volume Climax', 'POC Migration'],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  date:         string
  time:         string
  symbol:       Symbol
  direction:    TradeDirection
  entry_price:  string
  exit_price:   string
  sl_price:     string
  contracts:    number
  result:       TradeResult
  pnl:          string
  rr:           string
  kill_zone:    KillZone | ''
  dol_type:     DolType  | ''
  confluences:  IctConfluence[]
  comment:      string
  notes:        string
  image_url:    string | null
}

const defaultForm = (): FormState => ({
  date:        format(new Date(), 'yyyy-MM-dd'),
  time:        format(new Date(), 'HH:mm'),
  symbol:      'MNQ',
  direction:   'long',
  entry_price: '',
  exit_price:  '',
  sl_price:    '',
  contracts:   1,
  result:      'win',
  pnl:         '',
  rr:          '',
  kill_zone:   '',
  dol_type:    '',
  confluences: [],
  comment:     '',
  notes:       '',
  image_url:   null,
})

// ─── Props ────────────────────────────────────────────────────────────────────

interface TradeFormProps {
  editTrade?: Trade | null
  onSaved:    () => void
  onCancel?:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TradeForm({ editTrade, onSaved, onCancel }: TradeFormProps) {
  const [form, setForm]         = useState<FormState>(defaultForm)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors]     = useState<Partial<Record<keyof FormState, string>>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Populate form when editing
  useEffect(() => {
    if (editTrade) {
      setForm({
        date:        editTrade.date,
        time:        editTrade.time,
        symbol:      editTrade.symbol,
        direction:   editTrade.direction,
        entry_price: String(editTrade.entry_price),
        exit_price:  String(editTrade.exit_price),
        sl_price:    String(editTrade.sl_price),
        contracts:   editTrade.contracts ?? 1,
        result:      editTrade.result,
        pnl:         String(editTrade.pnl),
        rr:          String(editTrade.rr),
        kill_zone:   editTrade.kill_zone ?? '',
        dol_type:    editTrade.dol_type  ?? '',
        confluences: (editTrade.confluences ?? []) as IctConfluence[],
        comment:     editTrade.comment   ?? '',
        notes:       editTrade.notes     ?? '',
        image_url:   editTrade.image_url ?? null,
      })
      if (editTrade.image_url) setImagePreview(editTrade.image_url)
    }
  }, [editTrade])

  // Auto-calculate RR and P&L when prices change
  useEffect(() => {
    const entry = parseFloat(form.entry_price)
    const exit  = parseFloat(form.exit_price)
    const sl    = parseFloat(form.sl_price)

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(sl) && sl !== entry) {
      const rr  = calcRR(form.direction, entry, exit, sl)
      const pnl = calcPnl(form.direction, entry, exit, form.symbol, form.contracts)
      setForm(f => ({ ...f, rr: String(rr), pnl: String(pnl) }))
    }
  }, [form.entry_price, form.exit_price, form.sl_price, form.direction, form.symbol, form.contracts])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  function toggleConfluence(c: IctConfluence) {
    setForm(f => ({
      ...f,
      confluences: f.confluences.includes(c)
        ? f.confluences.filter(x => x !== c)
        : [...f.confluences, c],
    }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `trades/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('trade-images')
      .upload(path, file, { upsert: true })

    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('trade-images').getPublicUrl(data.path)
    setForm(f => ({ ...f, image_url: urlData.publicUrl }))
    setImagePreview(urlData.publicUrl)
    setUploading(false)
  }

  function removeImage() {
    setForm(f => ({ ...f, image_url: null }))
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.date)         errs.date        = 'Requerido'
    if (!form.time)         errs.time        = 'Requerido'
    if (!form.entry_price)  errs.entry_price = 'Requerido'
    if (!form.exit_price)   errs.exit_price  = 'Requerido'
    if (!form.sl_price)     errs.sl_price    = 'Requerido'
    if (!form.pnl)          errs.pnl         = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)

    const payload = {
      date:        form.date,
      time:        form.time,
      symbol:      form.symbol,
      direction:   form.direction,
      entry_price: parseFloat(form.entry_price),
      exit_price:  parseFloat(form.exit_price),
      sl_price:    parseFloat(form.sl_price),
      contracts:   form.contracts,
      result:      form.result,
      pnl:         parseFloat(form.pnl),
      rr:          parseFloat(form.rr) || 0,
      confluences: form.confluences,
      dol_type:    (form.dol_type   || null) as DolType  | null,
      kill_zone:   (form.kill_zone  || null) as KillZone | null,
      comment:     form.comment  || null,
      notes:       form.notes    || null,
      image_url:   form.image_url || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('trades') as any
    let error
    if (editTrade) {
      ;({ error } = await table.update(payload).eq('id', editTrade.id))
    } else {
      ;({ error } = await table.insert(payload))
    }

    setSaving(false)
    if (!error) {
      setForm(defaultForm())
      setImagePreview(null)
      onSaved()
    } else {
      console.error(error)
    }
  }

  const rrNum  = parseFloat(form.rr)  || 0
  const pnlNum = parseFloat(form.pnl) || 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Row 1: Date / Time / Symbol / Direction ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField label="Fecha" required error={errors.date}>
          <Input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            error={!!errors.date}
          />
        </FormField>

        <FormField label="Hora" required error={errors.time}>
          <Input
            type="time"
            value={form.time}
            onChange={e => set('time', e.target.value)}
            error={!!errors.time}
          />
        </FormField>

        <FormField label="Símbolo" required>
          <div className="grid grid-cols-4 gap-1">
            {SYMBOLS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('symbol', s)}
                className={cn(
                  'py-2.5 rounded-lg text-xs font-semibold border transition-colors',
                  form.symbol === s
                    ? 'bg-[#4f8ef7]/10 border-[#4f8ef7] text-[#4f8ef7]'
                    : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Dirección" required>
          <div className="grid grid-cols-2 gap-1">
            {(['long', 'short'] as TradeDirection[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => set('direction', d)}
                className={cn(
                  'py-2.5 rounded-lg text-xs font-semibold border capitalize transition-colors',
                  form.direction === d
                    ? d === 'long'
                      ? 'bg-[#26de81]/10 border-[#26de81] text-[#26de81]'
                      : 'bg-[#fc5c65]/10 border-[#fc5c65] text-[#fc5c65]'
                    : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                )}
              >
                {d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      {/* ── Row 2: Prices + contracts ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField label="Entry Price" required error={errors.entry_price}>
          <Input
            type="number"
            step="0.25"
            placeholder="0.00"
            value={form.entry_price}
            onChange={e => set('entry_price', e.target.value)}
            error={!!errors.entry_price}
          />
        </FormField>

        <FormField label="Exit Price" required error={errors.exit_price}>
          <Input
            type="number"
            step="0.25"
            placeholder="0.00"
            value={form.exit_price}
            onChange={e => set('exit_price', e.target.value)}
            error={!!errors.exit_price}
          />
        </FormField>

        <FormField label="SL Price" required error={errors.sl_price}>
          <Input
            type="number"
            step="0.25"
            placeholder="0.00"
            value={form.sl_price}
            onChange={e => set('sl_price', e.target.value)}
            error={!!errors.sl_price}
          />
        </FormField>

        <FormField label="Contratos">
          <Input
            type="number"
            step="1"
            min="1"
            placeholder="1"
            value={String(form.contracts)}
            onChange={e => set('contracts', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </FormField>
      </div>

      {/* ── Auto-calc display ── */}
      {(form.entry_price && form.exit_price && form.sl_price) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#13151c] border border-[#2a2d3a] rounded-lg">
          <Calculator size={14} className="text-[#4f8ef7] shrink-0" />
          <div className="flex gap-6 text-sm">
            <span className="text-[#6b7280]">
              RR: <span className={cn('font-semibold', rrNum >= 0 ? 'text-[#26de81]' : 'text-[#fc5c65]')}>
                {rrNum >= 0 ? '+' : ''}{rrNum.toFixed(2)}R
              </span>
            </span>
            <span className="text-[#6b7280]">
              P&L estimado: <span className={cn('font-semibold', pnlNum >= 0 ? 'text-[#26de81]' : 'text-[#fc5c65]')}>
                {pnlNum >= 0 ? '+' : ''}{formatCurrency(pnlNum)}
              </span>
            </span>
            <span className="text-[#6b7280] text-xs self-center">
              ({form.contracts} contrato{form.contracts !== 1 ? 's' : ''} {form.symbol})
            </span>
          </div>
        </div>
      )}

      {/* ── Row 3: Result / P&L / RR ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Resultado" required>
          <div className="grid grid-cols-3 gap-1">
            {(['win', 'loss', 'BE'] as TradeResult[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => set('result', r)}
                className={cn(
                  'py-2.5 rounded-lg text-xs font-semibold border uppercase transition-colors',
                  form.result === r
                    ? r === 'win'
                      ? 'bg-[#26de81]/10 border-[#26de81] text-[#26de81]'
                      : r === 'loss'
                        ? 'bg-[#fc5c65]/10 border-[#fc5c65] text-[#fc5c65]'
                        : 'bg-[#f7c948]/10 border-[#f7c948] text-[#f7c948]'
                    : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="P&L ($)" required error={errors.pnl}>
          <Input
            type="number"
            step="0.01"
            placeholder="Calculado automáticamente"
            value={form.pnl}
            onChange={e => set('pnl', e.target.value)}
            error={!!errors.pnl}
          />
        </FormField>

        <FormField label="R:R">
          <Input
            type="number"
            step="0.001"
            placeholder="Calculado automáticamente"
            value={form.rr}
            onChange={e => set('rr', e.target.value)}
          />
        </FormField>
      </div>

      {/* ── Row 4: Kill Zone / DOL ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Kill Zone">
          <div className="grid grid-cols-4 gap-1">
            {KILL_ZONES.map(kz => (
              <button
                key={kz}
                type="button"
                onClick={() => set('kill_zone', form.kill_zone === kz ? '' : kz)}
                className={cn(
                  'py-2 rounded-lg text-xs font-medium border transition-colors',
                  form.kill_zone === kz
                    ? 'bg-[#4f8ef7]/10 border-[#4f8ef7] text-[#4f8ef7]'
                    : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                )}
              >
                {kz}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="DOL Objetivo">
          <Select
            value={form.dol_type}
            onChange={e => set('dol_type', e.target.value as DolType | '')}
          >
            <option value="">— Sin especificar —</option>
            {DOL_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FormField>
      </div>

      {/* ── Confluences ── */}
      <FormField label="Confluencias">
        <div className="space-y-3">
          {CONFLUENCE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[#4b5563] text-[10px] font-semibold uppercase tracking-widest mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleConfluence(c)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      form.confluences.includes(c)
                        ? 'bg-[#4f8ef7]/10 border-[#4f8ef7] text-[#4f8ef7]'
                        : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormField>

      {/* ── Comment / Notes / Image ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Comentario">
          <Textarea
            rows={4}
            placeholder="Setup, contexto del mercado, emociones..."
            value={form.comment}
            onChange={e => set('comment', e.target.value)}
          />
        </FormField>

        <FormField label="Notas">
          <Textarea
            rows={4}
            placeholder="Lecciones aprendidas, qué mejorar..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </FormField>
      </div>

      {/* ── Image upload ── */}
      <FormField label="Imagen del trade (gráfico)">
        {imagePreview ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Trade chart"
              className="w-full max-h-64 object-contain rounded-lg border border-[#2a2d3a]"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-[#0d0f14]/80 border border-[#2a2d3a] rounded-full p-1 text-[#6b7280] hover:text-[#fc5c65] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 w-full h-32',
              'border-2 border-dashed border-[#2a2d3a] rounded-lg cursor-pointer',
              'hover:border-[#4f8ef7]/50 hover:bg-[#4f8ef7]/5 transition-colors',
              uploading && 'opacity-60 pointer-events-none'
            )}
          >
            {uploading
              ? <Loader2 size={20} className="text-[#4f8ef7] animate-spin" />
              : <Upload size={20} className="text-[#4b5563]" />
            }
            <span className="text-xs text-[#6b7280]">
              {uploading ? 'Subiendo...' : 'Click o arrastra una imagen'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        )}
      </FormField>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2a2d3a]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#e8eaf0] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
            'bg-[#4f8ef7] hover:bg-[#3d7de6] text-white',
            saving && 'opacity-60 cursor-not-allowed'
          )}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {editTrade ? 'Guardar cambios' : 'Registrar trade'}
        </button>
      </div>
    </form>
  )
}
