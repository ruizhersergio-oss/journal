'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatPercent } from '@/lib/utils'
import TradeForm from '@/components/diario/TradeForm'
import TodayTrades from '@/components/diario/TodayTrades'
import MetricCard from '@/components/dashboard/MetricCard'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import type { Trade } from '@/types/database'
import type { DayData } from '@/hooks/useMetrics'

export default function BacktestingPage() {
  const [dayTrades,  setDayTrades]  = useState<Trade[]>([])
  const [allTrades,  setAllTrades]  = useState<Trade[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editTrade,  setEditTrade]  = useState<Trade | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Trades for selected date
  const fetchDayTrades = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('trade_type', 'backtest')
      .eq('date', selectedDate)
      .order('time', { ascending: true })
    if (!error && data) setDayTrades(data as Trade[])
    setLoading(false)
  }, [selectedDate])

  // All backtest trades for calendar + global metrics
  const fetchAllTrades = useCallback(async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('trade_type', 'backtest')
      .order('date', { ascending: false })
    if (!error && data) setAllTrades(data as Trade[])
  }, [])

  useEffect(() => { fetchDayTrades() }, [fetchDayTrades])
  useEffect(() => { fetchAllTrades() }, [fetchAllTrades])

  function handleEdit(trade: Trade) {
    setEditTrade(trade)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSaved() {
    setShowForm(false)
    setEditTrade(null)
    fetchDayTrades()
    fetchAllTrades()
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

  // Global metrics (all backtest trades)
  const wins    = allTrades.filter(t => t.result === 'win')
  const losses  = allTrades.filter(t => t.result === 'loss')
  const wl      = wins.length + losses.length
  const winRate = wl > 0 ? (wins.length / wl) * 100 : 0
  const totalR  = allTrades.reduce((s, t) => s + t.rr, 0)
  const avgRR   = allTrades.length > 0 ? totalR / allTrades.length : 0

  // R-based dayMap for calendar (pnl field = sum of RR)
  const rDayMap = useMemo(() => {
    const map = new Map<string, DayData>()
    for (const t of allTrades) {
      const d = map.get(t.date) ?? {
        date: t.date, pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0,
      }
      d.pnl    += t.rr
      d.trades += 1
      if (t.result === 'win')  d.wins  += 1
      if (t.result === 'loss') d.losses += 1
      map.set(t.date, d)
    }
    for (const d of map.values()) {
      d.winRate = d.wins + d.losses > 0 ? (d.wins / (d.wins + d.losses)) * 100 : 0
    }
    return map
  }, [allTrades])

  return (
    <div className="p-6 max-w-[1100px] space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#e8eaf0] text-xl font-bold">Backtesting</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Sesiones de práctica — sin impacto en estadísticas reales
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditTrade(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Nueva sesión
          </button>
        )}
      </div>

      {/* ── Form panel ── */}
      {showForm && (
        <div className="bg-[#1a1d27] border border-[#a855f7]/30 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]">
            <h2 className="text-[#e8eaf0] font-semibold text-sm">
              {editTrade
                ? `Editar — ${editTrade.symbol} ${editTrade.time.slice(0, 5)}`
                : 'Nueva sesión de backtest'}
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
              defaultTradeType="backtest"
            />
          </div>
        </div>
      )}

      {/* ── Global metrics ── */}
      {allTrades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="WIN RATE"
            value={formatPercent(winRate)}
            sub={`${wins.length}W / ${losses.length}L`}
            trend={winRate >= 50 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="AVG RR"
            value={`${avgRR >= 0 ? '+' : ''}${avgRR.toFixed(2)}R`}
            trend={avgRR > 0 ? 'positive' : avgRR < 0 ? 'negative' : 'neutral'}
          />
          <MetricCard
            label="TOTAL R"
            value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
            trend={totalR > 0 ? 'positive' : totalR < 0 ? 'negative' : 'neutral'}
            highlight
          />
          <MetricCard
            label="TRADES"
            value={String(allTrades.length)}
            sub="sesiones grabadas"
            trend="neutral"
          />
        </div>
      )}

      {/* ── Calendar ── */}
      {allTrades.length > 0 && (
        <MonthCalendar dayMap={rDayMap} unit="R" />
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
            className="bg-[#13151c] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-[#e8eaf0] focus:outline-none focus:ring-1 focus:ring-[#a855f7] cursor-pointer"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
              className="px-3 py-2 text-xs font-medium text-[#a855f7] border border-[#a855f7]/30 rounded-lg hover:bg-[#a855f7]/10 transition-colors"
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
      </div>

      {/* ── Trade list ── */}
      {loading ? (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-12 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <TodayTrades
          trades={dayTrades}
          onEdit={handleEdit}
          onDelete={() => { fetchDayTrades(); fetchAllTrades() }}
          date={selectedDate}
        />
      )}
    </div>
  )
}
