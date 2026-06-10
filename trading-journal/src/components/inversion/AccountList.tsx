'use client'

import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import type { AccountWithPayouts, AccountStatus } from '@/types/database'

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AccountStatus, { label: string; classes: string }> = {
  activa:     { label: 'Activa',     classes: 'bg-[#4f8ef7]/10 text-[#4f8ef7] border-[#4f8ef7]/20' },
  funded:     { label: 'Funded',     classes: 'bg-[#26de81]/10 text-[#26de81] border-[#26de81]/20' },
  breached:   { label: 'Breached',   classes: 'bg-[#fc5c65]/10 text-[#fc5c65] border-[#fc5c65]/20' },
  completada: { label: 'Completada', classes: 'bg-[#6b7280]/10 text-[#9ca3af] border-[#6b7280]/20' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccountListProps {
  accounts: AccountWithPayouts[]
  onEdit:   (account: AccountWithPayouts) => void
  onDelete: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AccountList({ accounts, onEdit, onDelete }: AccountListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta cuenta y todos sus payouts?')) return
    setDeletingId(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('funding_accounts') as any).delete().eq('id', id)
    setDeletingId(null)
    onDelete()
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-10 text-center text-[#6b7280] text-sm">
        No hay cuentas registradas aún.
      </div>
    )
  }

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_100px_1fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-[#2a2d3a]">
        {['Cuenta', 'Prop Firm', 'Estado', 'Coste', 'Payouts', 'Neto', ''].map(h => (
          <span key={h} className="text-[#6b7280] text-xs font-medium uppercase tracking-wider">
            {h}
          </span>
        ))}
      </div>

      <div className="divide-y divide-[#2a2d3a]">
        {accounts.map(acc => {
          const expanded   = expandedId === acc.id
          const isDeleting = deletingId === acc.id
          const status     = STATUS_CONFIG[acc.status]
          const netPositive = acc.net_pnl > 0
          const netNegative = acc.net_pnl < 0

          return (
            <div key={acc.id}>
              {/* Main row */}
              <div
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_100px_1fr_1fr_1fr_80px] gap-4 items-center px-5 py-4 hover:bg-[#1f2230] transition-colors cursor-pointer"
                onClick={() => setExpandedId(expanded ? null : acc.id)}
              >
                {/* Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[#e8eaf0] text-sm font-medium truncate">{acc.name}</span>
                    <span className="text-[#6b7280] text-xs">{acc.purchase_date}</span>
                  </div>
                  {expanded
                    ? <ChevronUp size={14} className="text-[#4b5563] shrink-0 ml-auto md:hidden" />
                    : <ChevronDown size={14} className="text-[#4b5563] shrink-0 ml-auto md:hidden" />
                  }
                </div>

                {/* Prop firm */}
                <span className="text-[#9ca3af] text-sm">{acc.prop_firm}</span>

                {/* Status badge */}
                <span className={cn(
                  'inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold border w-fit',
                  status.classes
                )}>
                  {status.label}
                </span>

                {/* Cost */}
                <span className="text-[#fc5c65] text-sm font-mono font-medium">
                  -{formatCurrency(acc.cost)}
                </span>

                {/* Payouts */}
                <span className="text-[#26de81] text-sm font-mono font-medium">
                  {acc.total_payouts > 0 ? `+${formatCurrency(acc.total_payouts)}` : '—'}
                </span>

                {/* Net */}
                <span className={cn(
                  'text-sm font-bold font-mono',
                  netPositive ? 'text-[#26de81]'
                    : netNegative ? 'text-[#fc5c65]'
                    : 'text-[#6b7280]'
                )}>
                  {acc.net_pnl >= 0 ? '+' : ''}{formatCurrency(acc.net_pnl)}
                </span>

                {/* Actions */}
                <div
                  className="flex items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setExpandedId(null); onEdit(acc) }}
                    className="p-1.5 rounded hover:bg-[#2a2d3a] text-[#6b7280] hover:text-[#4f8ef7] transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    disabled={isDeleting}
                    className="p-1.5 rounded hover:bg-[#2a2d3a] text-[#6b7280] hover:text-[#fc5c65] transition-colors disabled:opacity-40"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded: payouts + notes */}
              {expanded && (
                <div className="px-5 pb-5 pt-1 space-y-4 bg-[#13151c]/60 border-t border-[#2a2d3a]">
                  {/* Notes */}
                  {acc.notes && (
                    <div>
                      <p className="text-[#6b7280] text-xs mb-1">Notas</p>
                      <p className="text-[#9ca3af] text-sm">{acc.notes}</p>
                    </div>
                  )}

                  {/* Payouts list */}
                  {acc.payouts.length > 0 ? (
                    <div>
                      <p className="text-[#6b7280] text-xs mb-2 uppercase tracking-wider">
                        Payouts ({acc.payouts.length})
                      </p>
                      <div className="space-y-1.5">
                        {acc.payouts
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map(p => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between py-2 px-3 bg-[#1a1d27] rounded-lg border border-[#2a2d3a]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[#6b7280] text-xs font-mono">{p.date}</span>
                                {p.notes && (
                                  <span className="text-[#9ca3af] text-xs">{p.notes}</span>
                                )}
                              </div>
                              <span className="text-[#26de81] text-sm font-bold font-mono">
                                +{formatCurrency(p.amount)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#4b5563] text-xs">Sin payouts registrados.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
