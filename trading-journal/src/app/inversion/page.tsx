'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import AccountForm from '@/components/inversion/AccountForm'
import AccountList from '@/components/inversion/AccountList'
import type { FundingAccount, Payout, AccountWithPayouts } from '@/types/database'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InversionPage() {
  const [accounts,    setAccounts]    = useState<AccountWithPayouts[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editAccount, setEditAccount] = useState<AccountWithPayouts | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)

    const { data: accs, error: accErr } = await supabase
      .from('funding_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (accErr || !accs) { setLoading(false); return }

    const { data: pays } = await supabase
      .from('payouts')
      .select('*')
      .order('date', { ascending: false })

    const payoutsMap = new Map<string, Payout[]>()
    for (const p of (pays ?? []) as Payout[]) {
      const list = payoutsMap.get(p.account_id) ?? []
      list.push(p)
      payoutsMap.set(p.account_id, list)
    }

    const result: AccountWithPayouts[] = (accs as FundingAccount[]).map(a => {
      const accountPayouts = payoutsMap.get(a.id) ?? []
      const total          = accountPayouts.reduce((s, p) => s + p.amount, 0)
      return {
        ...a,
        payouts:       accountPayouts,
        total_payouts: total,
        net_pnl:       total - a.cost,
      }
    })

    setAccounts(result)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  function handleEdit(account: AccountWithPayouts) {
    setEditAccount(account)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSaved() {
    setShowForm(false)
    setEditAccount(null)
    fetchAccounts()
  }

  function handleCancel() {
    setShowForm(false)
    setEditAccount(null)
  }

  // ── Summary numbers ──────────────────────────────────────────────────────
  const totalInvested = accounts.reduce((s, a) => s + a.cost, 0)
  const totalPayouts  = accounts.reduce((s, a) => s + a.total_payouts, 0)
  const netResult     = totalPayouts - totalInvested
  const roi           = totalInvested > 0 ? (netResult / totalInvested) * 100 : 0

  const activeCount   = accounts.filter(a => a.status === 'activa').length
  const fundedCount   = accounts.filter(a => a.status === 'funded').length
  const breachedCount = accounts.filter(a => a.status === 'breached').length

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[#e8eaf0] text-xl font-bold">Inversión vs Retorno</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Historial de cuentas de fondeo y payouts recibidos
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => { setEditAccount(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4f8ef7] hover:bg-[#3d7de6] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nueva cuenta
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Wallet size={18} />}
          label="Total invertido"
          value={formatCurrency(totalInvested)}
          sub={`${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''}`}
          valueColor="text-[#fc5c65]"
          iconBg="bg-[#fc5c65]/10"
          iconColor="text-[#fc5c65]"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          label="Total retirado"
          value={formatCurrency(totalPayouts)}
          sub={`${accounts.reduce((s, a) => s + a.payouts.length, 0)} pago${accounts.reduce((s, a) => s + a.payouts.length, 0) !== 1 ? 's' : ''}`}
          valueColor="text-[#26de81]"
          iconBg="bg-[#26de81]/10"
          iconColor="text-[#26de81]"
        />
        <SummaryCard
          icon={netResult >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          label="Resultado neto"
          value={`${netResult >= 0 ? '+' : ''}${formatCurrency(netResult)}`}
          sub={`${activeCount} activa${activeCount !== 1 ? 's' : ''} · ${fundedCount} funded · ${breachedCount} breached`}
          valueColor={netResult > 0 ? 'text-[#26de81]' : netResult < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'}
          iconBg={netResult > 0 ? 'bg-[#26de81]/10' : 'bg-[#fc5c65]/10'}
          iconColor={netResult > 0 ? 'text-[#26de81]' : 'text-[#fc5c65]'}
          highlight
        />
        <SummaryCard
          icon={<Percent size={18} />}
          label="ROI"
          value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
          sub="sobre el total invertido"
          valueColor={roi > 0 ? 'text-[#26de81]' : roi < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'}
          iconBg={roi > 0 ? 'bg-[#26de81]/10' : 'bg-[#4f8ef7]/10'}
          iconColor={roi > 0 ? 'text-[#26de81]' : 'text-[#4f8ef7]'}
        />
      </div>

      {/* ── Break-even indicator ── */}
      {accounts.length > 0 && (
        <BreakEvenBar invested={totalInvested} recovered={totalPayouts} />
      )}

      {/* ── Form panel ── */}
      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]">
            <h2 className="text-[#e8eaf0] font-semibold text-sm">
              {editAccount ? `Editar — ${editAccount.name}` : 'Nueva cuenta de fondeo'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#1f2230] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-5">
            <AccountForm
              editAccount={editAccount}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {/* ── Account list ── */}
      {loading ? (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AccountList
          accounts={accounts}
          onEdit={handleEdit}
          onDelete={fetchAccounts}
        />
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon:        React.ReactNode
  label:       string
  value:       string
  sub?:        string
  valueColor?: string
  iconBg?:     string
  iconColor?:  string
  highlight?:  boolean
}

function SummaryCard({ icon, label, value, sub, valueColor, iconBg, iconColor, highlight }: SummaryCardProps) {
  return (
    <div className={cn(
      'bg-[#1a1d27] border rounded-xl p-5 flex flex-col gap-3',
      highlight ? 'border-[#4f8ef7]/30' : 'border-[#2a2d3a]'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[#6b7280] text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className={cn('p-2 rounded-lg', iconBg ?? 'bg-[#2a2d3a]')}>
          <span className={iconColor ?? 'text-[#6b7280]'}>{icon}</span>
        </div>
      </div>
      <div>
        <p className={cn('text-2xl font-bold leading-none', valueColor ?? 'text-[#e8eaf0]')}>
          {value}
        </p>
        {sub && <p className="text-[#6b7280] text-xs mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Break-even progress bar ─────────────────────────────────────────────────

function BreakEvenBar({ invested, recovered }: { invested: number; recovered: number }) {
  const pct     = invested > 0 ? Math.min((recovered / invested) * 100, 100) : 0
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl px-5 py-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#6b7280]">
          Recuperación de inversión
        </span>
        <span className={cn(
          'font-semibold',
          pct >= 100 ? 'text-[#26de81]' : 'text-[#f7c948]'
        )}>
          {pct.toFixed(1)}% recuperado
          {pct >= 100 && ' ✓'}
        </span>
      </div>
      <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            pct >= 100 ? 'bg-[#26de81]' : 'bg-[#f7c948]'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-[#4b5563]">
        <span>$0</span>
        <span className={pct >= 100 ? 'text-[#26de81]' : 'text-[#6b7280]'}>
          Break-even: {formatCurrency(invested)}
        </span>
      </div>
    </div>
  )
}
