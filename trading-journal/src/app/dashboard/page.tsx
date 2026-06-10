'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useMetrics } from '@/hooks/useMetrics'
import { formatCurrency, formatPercent, formatR, cn } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import PnlCharts from '@/components/dashboard/PnlCharts'
import type { Trade } from '@/types/database'

type TimeFilter = 'today' | '7d' | '1m' | 'all'

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d',    label: '7 días' },
  { key: '1m',    label: '1 mes' },
  { key: 'all',   label: 'Todo' },
]

export default function DashboardPage() {
  const [trades, setTrades]       = useState<Trade[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<TimeFilter>('1m')
  const [showR, setShowR]         = useState(false)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('trades').select('*').order('date', { ascending: false })

    if (filter === 'today') {
      const today = format(new Date(), 'yyyy-MM-dd')
      query = query.eq('date', today)
    } else if (filter === '7d') {
      const from = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      query = query.gte('date', from)
    } else if (filter === '1m') {
      const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      query = query.gte('date', from)
    }

    const { data, error } = await query
    if (!error && data) setTrades(data as Trade[])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const { metrics, dayMap } = useMetrics(trades)

  const pnlTrend = (v: number) => v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral'

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#e8eaf0] text-xl font-bold">Dashboard</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Resumen de tu actividad</p>
        </div>

        <div className="flex items-center gap-3">
          {/* R toggle */}
          <button
            onClick={() => setShowR(v => !v)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              showR
                ? 'bg-[#4f8ef7]/10 border-[#4f8ef7]/50 text-[#4f8ef7]'
                : 'border-[#2a2d3a] text-[#6b7280] hover:text-[#e8eaf0] hover:border-[#3a3d4a]'
            )}
          >
            {showR ? 'Ver $' : 'Ver R'}
          </button>

          {/* Time filters */}
          <div className="flex gap-1 bg-[#13151c] border border-[#2a2d3a] rounded-xl p-1">
            {TIME_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-[#4f8ef7] text-white'
                    : 'text-[#6b7280] hover:text-[#e8eaf0]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard
            label="NET P&L"
            value={showR ? formatR(metrics.totalR) : formatCurrency(metrics.netPnl)}
            sub={`${metrics.totalTrades} trades`}
            trend={pnlTrend(metrics.netPnl)}
            highlight
          />
          <MetricCard
            label="WIN RATE"
            value={formatPercent(metrics.winRate)}
            sub={`${trades.filter(t => t.result === 'win').length}W / ${trades.filter(t => t.result === 'loss').length}L`}
            trend={metrics.winRate >= 50 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="AVG RR"
            value={`${metrics.avgRR >= 0 ? '+' : ''}${metrics.avgRR.toFixed(2)}R`}
            trend={metrics.avgRR > 0 ? 'positive' : metrics.avgRR < 0 ? 'negative' : 'neutral'}
          />
          <MetricCard
            label="PROFIT FACTOR"
            value={metrics.profitFactor === 999 ? '∞' : metrics.profitFactor.toFixed(2)}
            trend={metrics.profitFactor >= 1 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="AVG WIN / LOSS"
            value={showR
              ? `${formatR(metrics.avgWin / 100)} / ${formatR(-metrics.avgLoss / 100)}`
              : `${formatCurrency(metrics.avgWin)} / ${formatCurrency(metrics.avgLoss)}`
            }
            trend="neutral"
          />
          <MetricCard
            label="DÍAS GANADORES"
            value={`${metrics.winDays}`}
            sub={`${metrics.lossDays} días perdedores`}
            trend={metrics.winDays > metrics.lossDays ? 'positive' : 'neutral'}
          />
          <MetricCard
            label="RACHA ACTUAL"
            value={metrics.currentStreak === 0 ? '—' : `${metrics.currentStreak}`}
            sub={metrics.streakType === 'win' ? 'wins seguidos' : metrics.streakType === 'loss' ? 'losses seguidos' : ''}
            trend={metrics.streakType === 'win' ? 'positive' : metrics.streakType === 'loss' ? 'negative' : 'neutral'}
          />
        </div>
      )}

      {/* Calendar + Charts layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2">
          <MonthCalendar dayMap={dayMap} showR={showR} />
        </div>

        {/* Weekly summary panel */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-[#e8eaf0] text-sm font-semibold mb-4">Resumen semanal</h3>
          {trades.length === 0 ? (
            <p className="text-[#6b7280] text-sm">Sin trades en este período.</p>
          ) : (
            <div className="space-y-3">
              {getWeeklySummary(trades).map((week, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a2d3a] last:border-0">
                  <div>
                    <p className="text-[#e8eaf0] text-xs font-medium">{week.label}</p>
                    <p className="text-[#6b7280] text-xs">{week.trades} trades · {formatPercent(week.winRate)} WR</p>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    week.pnl > 0 ? 'text-[#26de81]' : 'text-[#fc5c65]'
                  )}>
                    {week.pnl >= 0 ? '+' : ''}{showR ? formatR(week.pnl / 100) : formatCurrency(week.pnl)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <PnlCharts dayMap={dayMap} showR={showR} />
    </div>
  )
}

function getWeeklySummary(trades: Trade[]) {
  const weekMap = new Map<string, { label: string; pnl: number; trades: number; wins: number; losses: number }>()

  for (const t of trades) {
    const date = new Date(t.date)
    const day  = date.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    const mon  = new Date(date)
    mon.setDate(date.getDate() + diff)
    const key   = format(mon, 'yyyy-MM-dd')
    const label = `Sem. ${format(mon, 'dd MMM')}`

    const existing = weekMap.get(key) ?? { label, pnl: 0, trades: 0, wins: 0, losses: 0 }
    existing.pnl    += t.pnl
    existing.trades += 1
    if (t.result === 'win')  existing.wins  += 1
    if (t.result === 'loss') existing.losses += 1
    weekMap.set(key, existing)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([, v]) => ({
      ...v,
      winRate: v.wins + v.losses > 0 ? (v.wins / (v.wins + v.losses)) * 100 : 0,
    }))
}
