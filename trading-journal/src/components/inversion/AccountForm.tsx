'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { FormField, Input, Textarea, Select } from '@/components/ui/FormField'
import type { AccountStatus, AccountWithPayouts } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const PROP_FIRM_OPTIONS: string[] = [
  'Lucid Trading', 'FTMO', 'MyForexFunds', 'TopStep', 'Apex', 'Otro',
]

const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: 'activa',      label: 'Activa' },
  { value: 'funded',      label: 'Funded' },
  { value: 'breached',    label: 'Breached' },
  { value: 'completada',  label: 'Completada' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayoutDraft {
  id:     string   // temp id for UI key
  amount: string
  date:   string
  notes:  string
  saved:  boolean  // true = already in DB
  dbId?:  string   // real UUID if already saved
}

interface FormState {
  name:          string
  prop_firm:     string
  cost:          string
  purchase_date: string
  status:        AccountStatus
  notes:         string
}

interface AccountFormProps {
  editAccount?: AccountWithPayouts | null
  onSaved:      () => void
  onCancel?:    () => void
}

const defaultForm = (): FormState => ({
  name:          '',
  prop_firm:     'Lucid Trading',
  cost:          '',
  purchase_date: format(new Date(), 'yyyy-MM-dd'),
  status:        'activa',
  notes:         '',
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountForm({ editAccount, onSaved, onCancel }: AccountFormProps) {
  const [form,    setForm]    = useState<FormState>(defaultForm)
  const [payouts, setPayouts] = useState<PayoutDraft[]>([])
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (editAccount) {
      setForm({
        name:          editAccount.name,
        prop_firm:     editAccount.prop_firm,
        cost:          String(editAccount.cost),
        purchase_date: editAccount.purchase_date,
        status:        editAccount.status,
        notes:         editAccount.notes ?? '',
      })
      setPayouts(
        editAccount.payouts.map(p => ({
          id:     p.id,
          amount: String(p.amount),
          date:   p.date,
          notes:  p.notes ?? '',
          saved:  true,
          dbId:   p.id,
        }))
      )
    }
  }, [editAccount])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  function addPayout() {
    setPayouts(p => [...p, {
      id:     crypto.randomUUID(),
      amount: '',
      date:   format(new Date(), 'yyyy-MM-dd'),
      notes:  '',
      saved:  false,
    }])
  }

  function updatePayout(id: string, field: 'amount' | 'date' | 'notes', value: string) {
    setPayouts(p => p.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  function removePayout(id: string) {
    setPayouts(p => p.filter(x => x.id !== id))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim())    errs.name          = 'Requerido'
    if (!form.cost)           errs.cost          = 'Requerido'
    if (!form.purchase_date)  errs.purchase_date = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const accountPayload = {
      name:          form.name.trim(),
      prop_firm:     form.prop_firm,
      cost:          parseFloat(form.cost),
      purchase_date: form.purchase_date,
      status:        form.status,
      notes:         form.notes || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('funding_accounts') as any
    let accountId = editAccount?.id

    if (editAccount) {
      const { error } = await table.update(accountPayload).eq('id', editAccount.id)
      if (error) { console.error(error); setSaving(false); return }
    } else {
      const { data, error } = await table.insert(accountPayload).select().single()
      if (error || !data) { console.error(error); setSaving(false); return }
      accountId = data.id
    }

    // Sync payouts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payoutsTable = supabase.from('payouts') as any

    // Delete removed payouts (those previously saved but no longer in list)
    if (editAccount) {
      const remainingDbIds = payouts.filter(p => p.saved && p.dbId).map(p => p.dbId!)
      const deletedIds     = editAccount.payouts
        .map(p => p.id)
        .filter(id => !remainingDbIds.includes(id))
      for (const id of deletedIds) {
        await payoutsTable.delete().eq('id', id)
      }
    }

    // Insert new payouts
    const newPayouts = payouts.filter(p => !p.saved && p.amount)
    for (const p of newPayouts) {
      await payoutsTable.insert({
        account_id: accountId,
        amount:     parseFloat(p.amount),
        date:       p.date,
        notes:      p.notes || null,
      })
    }

    setSaving(false)
    setForm(defaultForm())
    setPayouts([])
    onSaved()
  }

  const totalPayouts = payouts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const cost         = parseFloat(form.cost) || 0
  const netPnl       = totalPayouts - cost

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Name / Prop firm ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre de la cuenta" required error={errors.name}>
          <Input
            placeholder="Ej: LucidFlex 25K Eval #1"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={!!errors.name}
          />
        </FormField>

        <FormField label="Prop Firm">
          <Select
            value={form.prop_firm}
            onChange={e => set('prop_firm', e.target.value)}
          >
            {PROP_FIRM_OPTIONS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </FormField>
      </div>

      {/* ── Cost / Date / Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Coste ($)" required error={errors.cost}>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.cost}
            onChange={e => set('cost', e.target.value)}
            error={!!errors.cost}
          />
        </FormField>

        <FormField label="Fecha de compra" required error={errors.purchase_date}>
          <Input
            type="date"
            value={form.purchase_date}
            onChange={e => set('purchase_date', e.target.value)}
            error={!!errors.purchase_date}
          />
        </FormField>

        <FormField label="Estado">
          <div className="grid grid-cols-2 gap-1">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => set('status', s.value)}
                className={cn(
                  'py-2 rounded-lg text-xs font-medium border transition-colors',
                  form.status === s.value
                    ? s.value === 'funded'
                      ? 'bg-[#26de81]/10 border-[#26de81] text-[#26de81]'
                      : s.value === 'activa'
                        ? 'bg-[#4f8ef7]/10 border-[#4f8ef7] text-[#4f8ef7]'
                        : s.value === 'breached'
                          ? 'bg-[#fc5c65]/10 border-[#fc5c65] text-[#fc5c65]'
                          : 'bg-[#6b7280]/10 border-[#6b7280] text-[#9ca3af]'
                    : 'border-[#2a2d3a] text-[#6b7280] hover:border-[#3a3d4a] hover:text-[#e8eaf0]'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      {/* ── Notes ── */}
      <FormField label="Notas">
        <Textarea
          rows={2}
          placeholder="Detalles del plan, objetivos..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </FormField>

      {/* ── Payouts ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">
            Payouts recibidos
          </label>
          <button
            type="button"
            onClick={addPayout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4f8ef7] border border-[#4f8ef7]/30 rounded-lg hover:bg-[#4f8ef7]/10 transition-colors"
          >
            <Plus size={12} />
            Añadir pago
          </button>
        </div>

        {payouts.length === 0 ? (
          <p className="text-[#4b5563] text-xs py-2">
            Sin pagos registrados aún.
          </p>
        ) : (
          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Importe $"
                  value={p.amount}
                  onChange={e => updatePayout(p.id, 'amount', e.target.value)}
                />
                <Input
                  type="date"
                  value={p.date}
                  onChange={e => updatePayout(p.id, 'date', e.target.value)}
                />
                <Input
                  placeholder="Nota opcional"
                  value={p.notes}
                  onChange={e => updatePayout(p.id, 'notes', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removePayout(p.id)}
                  className="p-2 text-[#6b7280] hover:text-[#fc5c65] transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Live P&L preview */}
        {(cost > 0 || totalPayouts > 0) && (
          <div className="flex items-center gap-6 px-4 py-3 bg-[#13151c] border border-[#2a2d3a] rounded-lg text-xs">
            <span className="text-[#6b7280]">
              Coste: <span className="text-[#fc5c65] font-semibold">{formatCurrency(cost)}</span>
            </span>
            <span className="text-[#6b7280]">
              Payouts: <span className="text-[#26de81] font-semibold">{formatCurrency(totalPayouts)}</span>
            </span>
            <span className="text-[#6b7280]">
              Neto:{' '}
              <span className={cn(
                'font-bold',
                netPnl > 0 ? 'text-[#26de81]' : netPnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'
              )}>
                {netPnl >= 0 ? '+' : ''}{formatCurrency(netPnl)}
              </span>
            </span>
          </div>
        )}
      </div>

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
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold',
            'bg-[#4f8ef7] hover:bg-[#3d7de6] text-white transition-colors',
            saving && 'opacity-60 cursor-not-allowed'
          )}
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {editAccount ? 'Guardar cambios' : 'Añadir cuenta'}
        </button>
      </div>
    </form>
  )
}
