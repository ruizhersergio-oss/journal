'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import TradeForm from '@/components/diario/TradeForm'
import TodayTrades from '@/components/diario/TodayTrades'
import type { Trade } from '@/types/database'

export default function DiarioPage() {
  const searchParams = useSearchParams()
  const [trades, setTrades]       = useState<Trade[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editTrade, setEditTrade] = useState<Trade | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const param = searchParams.get('date')
    return param ?? format(new Date(), 'yyyy-MM-dd')
  })

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('date', selectedDate)
      .order('time', { ascending: true })
    if (!error && data) setTrades(data as Trade[])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  function handleEdit(trade: Trade) {
    setEditTrade(trade)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSaved() {
    setShowForm(false)
    setEditTrade(null)
    fetchTrades()
  }

  function handleCancel() {
    setShowForm(false)
    setEditTrade(null)
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="p-6 max-w-[1100px] space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#e8eaf0] text-xl font-bold">Diario de trades</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Registra y revisa tus operaciones</p>
        </div>

        {!showForm && (
          <button
            onClick={() => { setEditTrade(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4f8ef7] hover:bg-[#3d7de6] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nuevo trade
          </button>
        )}
      </div>

      {/* ── Form panel ── */}
      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]">
            <h2 className="text-[#e8eaf0] font-semibold text-sm">
              {editTrade ? `Editar trade — ${editTrade.symbol} ${editTrade.time.slice(0, 5)}` : 'Nuevo trade'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#1f2230] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-5">
            <TradeForm
              editTrade={editTrade}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {/* ── Date navigator ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => shiftDate(-1)}
          className="p-2 rounded-lg border border-[#2a2d3a] text-[#6b7280] hover:text-[#e8eaf0] hover:border-[#3a3d4a] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-[#13151c] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-[#e8eaf0] focus:outline-none focus:ring-1 focus:ring-[#4f8ef7] cursor-pointer"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
              className="px-3 py-2 text-xs font-medium text-[#4f8ef7] border border-[#4f8ef7]/30 rounded-lg hover:bg-[#4f8ef7]/10 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={cn(
            'p-2 rounded-lg border border-[#2a2d3a] transition-colors',
            isToday
              ? 'text-[#2a2d3a] cursor-not-allowed'
              : 'text-[#6b7280] hover:text-[#e8eaf0] hover:border-[#3a3d4a]'
          )}
        >
          <ChevronRight size={16} />
        </button>

        {/* Day summary pill */}
        {!loading && trades.length > 0 && (
          <DaySummaryPill trades={trades} />
        )}
      </div>

      {/* ── Trade list ── */}
      {loading ? (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#4f8ef7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <TodayTrades
          trades={trades}
          onEdit={handleEdit}
          onDelete={fetchTrades}
          date={selectedDate}
        />
      )}
    </div>
  )
}

// ─── Day summary pill ──────────────────────────────────────────────────────────

function DaySummaryPill({ trades }: { trades: Trade[] }) {
  const pnl    = trades.reduce((s, t) => s + t.pnl, 0)
  const wins   = trades.filter(t => t.result === 'win').length
  const losses = trades.filter(t => t.result === 'loss').length
  const wr     = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 rounded-lg border text-xs font-medium',
      pnl > 0
        ? 'bg-[#26de81]/5 border-[#26de81]/20 text-[#26de81]'
        : pnl < 0
          ? 'bg-[#fc5c65]/5 border-[#fc5c65]/20 text-[#fc5c65]'
          : 'bg-[#1a1d27] border-[#2a2d3a] text-[#6b7280]'
    )}>
      <span>{pnl >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pnl)}</span>
      <span className="text-[#4b5563]">·</span>
      <span className="text-[#6b7280]">{wr}% WR</span>
      <span className="text-[#4b5563]">·</span>
      <span className="text-[#6b7280]">{trades.length}t</span>
    </div>
  )
}
