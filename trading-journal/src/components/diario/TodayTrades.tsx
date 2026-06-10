'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2, ChevronDown, ChevronUp, ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import type { Trade } from '@/types/database'

interface TodayTradesProps {
  trades:   Trade[]
  onEdit:   (trade: Trade) => void
  onDelete: () => void
  date:     string
}

export default function TodayTrades({ trades, onEdit, onDelete, date }: TodayTradesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este trade?')) return
    setDeletingId(id)
    await supabase.from('trades').delete().eq('id', id)
    setDeletingId(null)
    onDelete()
  }

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const wins      = trades.filter(t => t.result === 'win').length
  const losses    = trades.filter(t => t.result === 'loss').length
  const winRate   = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]">
        <div>
          <h3 className="text-[#e8eaf0] font-semibold text-sm">
            Trades del {format(new Date(date + 'T12:00:00'), 'dd MMM yyyy')}
          </h3>
          <p className="text-[#6b7280] text-xs mt-0.5">
            {trades.length} trade{trades.length !== 1 ? 's' : ''} · {wins}W {losses}L · {winRate.toFixed(0)}% WR
          </p>
        </div>
        <span className={cn(
          'text-base font-bold',
          totalPnl > 0 ? 'text-[#26de81]' : totalPnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'
        )}>
          {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
        </span>
      </div>

      {/* Trade rows */}
      {trades.length === 0 ? (
        <div className="py-12 text-center text-[#6b7280] text-sm">
          No hay trades registrados para esta fecha.
        </div>
      ) : (
        <div className="divide-y divide-[#2a2d3a]">
          {trades.map(trade => {
            const expanded = expandedId === trade.id
            const isDeleting = deletingId === trade.id

            return (
              <div key={trade.id} className="hover:bg-[#1f2230] transition-colors">
                {/* Main row */}
                <div className="flex items-center gap-3 px-5 py-3">
                  {/* Result badge */}
                  <span className={cn(
                    'w-12 text-center py-1 rounded text-xs font-bold uppercase shrink-0',
                    trade.result === 'win'  && 'bg-[#26de81]/10 text-[#26de81]',
                    trade.result === 'loss' && 'bg-[#fc5c65]/10 text-[#fc5c65]',
                    trade.result === 'BE'   && 'bg-[#f7c948]/10 text-[#f7c948]',
                  )}>
                    {trade.result}
                  </span>

                  {/* Time */}
                  <span className="text-[#6b7280] text-xs font-mono w-12 shrink-0">
                    {trade.time.slice(0, 5)}
                  </span>

                  {/* Symbol + direction */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[#e8eaf0] text-xs font-semibold">{trade.symbol}</span>
                    <span className={cn(
                      'text-xs font-medium',
                      trade.direction === 'long' ? 'text-[#26de81]' : 'text-[#fc5c65]'
                    )}>
                      {trade.direction === 'long' ? '↑' : '↓'}
                    </span>
                    {(trade.contracts ?? 1) > 1 && (
                      <span className="text-xs text-[#f7c948] font-medium">x{trade.contracts}</span>
                    )}
                  </div>

                  {/* Prices */}
                  <div className="flex items-center gap-1 text-xs text-[#6b7280] flex-1 min-w-0">
                    <span className="font-mono">{trade.entry_price}</span>
                    <span>→</span>
                    <span className="font-mono">{trade.exit_price}</span>
                    <span className="text-[#4b5563]">(SL {trade.sl_price})</span>
                  </div>

                  {/* RR */}
                  <span className={cn(
                    'text-xs font-medium shrink-0',
                    trade.rr >= 0 ? 'text-[#e8eaf0]' : 'text-[#fc5c65]'
                  )}>
                    {trade.rr >= 0 ? '+' : ''}{trade.rr.toFixed(2)}R
                  </span>

                  {/* P&L */}
                  <span className={cn(
                    'text-sm font-bold w-24 text-right shrink-0',
                    trade.pnl > 0 ? 'text-[#26de81]' : trade.pnl < 0 ? 'text-[#fc5c65]' : 'text-[#f7c948]'
                  )}>
                    {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                  </span>

                  {/* Kill zone badge */}
                  {trade.kill_zone && (
                    <span className="hidden lg:block px-2 py-0.5 rounded bg-[#4f8ef7]/10 text-[#4f8ef7] text-xs shrink-0">
                      {trade.kill_zone}
                    </span>
                  )}

                  {/* Image indicator */}
                  {trade.image_url && (
                    <ImageIcon size={12} className="text-[#4b5563] shrink-0" />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : trade.id)}
                      className="p-1.5 rounded hover:bg-[#2a2d3a] text-[#6b7280] hover:text-[#e8eaf0] transition-colors"
                      title="Ver detalles"
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => onEdit(trade)}
                      className="p-1.5 rounded hover:bg-[#2a2d3a] text-[#6b7280] hover:text-[#4f8ef7] transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(trade.id)}
                      disabled={isDeleting}
                      className="p-1.5 rounded hover:bg-[#2a2d3a] text-[#6b7280] hover:text-[#fc5c65] transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-5 pb-4 space-y-3 bg-[#13151c]/60">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {trade.dol_type && (
                        <div>
                          <p className="text-[#6b7280]">DOL objetivo</p>
                          <p className="text-[#e8eaf0] font-medium mt-0.5">{trade.dol_type}</p>
                        </div>
                      )}
                      {trade.kill_zone && (
                        <div>
                          <p className="text-[#6b7280]">Kill zone</p>
                          <p className="text-[#e8eaf0] font-medium mt-0.5">{trade.kill_zone}</p>
                        </div>
                      )}
                      {trade.confluences?.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-[#6b7280] mb-1">Confluencias</p>
                          <div className="flex flex-wrap gap-1">
                            {trade.confluences.map(c => (
                              <span key={c} className="px-2 py-0.5 bg-[#4f8ef7]/10 text-[#4f8ef7] rounded text-xs">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {trade.comment && (
                      <div>
                        <p className="text-[#6b7280] text-xs mb-1">Comentario</p>
                        <p className="text-[#e8eaf0] text-xs leading-relaxed">{trade.comment}</p>
                      </div>
                    )}

                    {trade.notes && (
                      <div>
                        <p className="text-[#6b7280] text-xs mb-1">Notas</p>
                        <p className="text-[#e8eaf0] text-xs leading-relaxed">{trade.notes}</p>
                      </div>
                    )}

                    {trade.image_url && (
                      <div>
                        <p className="text-[#6b7280] text-xs mb-2">Gráfico</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={trade.image_url}
                          alt="Trade chart"
                          className="max-h-80 rounded-lg border border-[#2a2d3a] object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
