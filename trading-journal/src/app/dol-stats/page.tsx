'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { subDays, format } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import DolCard from '@/components/dol-stats/DolCard'
import DolTable from '@/components/dol-stats/DolTable'
import type { DolStat } from '@/components/dol-stats/DolCard'
import type { Trade, DolType } from '@/types/database'

// ─── Constants ────────────────────────────────────────────────────────────────

type TimeFilter = 'today' | '7d' | '1m' | 'all'

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d',    label: '7 días' },
  { key: '1m',    label: '1 mes' },
  { key: 'all',   label: 'Todo' },
]

const ALL_DOL_TYPES: DolType[] = [
  'SSL', 'BSL', 'Equal Highs', 'Equal Lows',
  'NY Opening Gap', 'Relative Equal Highs', 'Relative Equal Lows',
  'Data Highs', 'Data Lows',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStats(trades: Trade[]): DolStat[] {
  return ALL_DOL_TYPES.map(dol => {
    const subset = trades.filter(t => t.dol_type === dol)
    const wins   = subset.filter(t => t.result === 'win')
    const losses = subset.filter(t => t.result === 'loss')
    const be     = subset.filter(t => t.result === 'BE')

    const wl = wins.length + losses.length
    const winRate = wl > 0 ? (wins.length / wl) * 100 : 0
    const avgRR   = wins.length > 0
      ? wins.reduce((s, t) => s + t.rr, 0) / wins.length
      : 0
    const pnl = subset.reduce((s, t) => s + t.pnl, 0)

    return {
      dol,
      total:  subset.length,
      wins:   wins.length,
      losses: losses.length,
      be:     be.length,
      winRate,
      avgRR:  parseFloat(avgRR.toFixed(3)),
      pnl:    parseFloat(pnl.toFixed(2)),
    }
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DolStatsPage() {
  const [trades,  setTrades]  = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<TimeFilter>('all')

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('trades')
      .select('*')
      .not('dol_type', 'is', null)

    if (filter === 'today') {
      query = query.eq('date', format(new Date(), 'yyyy-MM-dd'))
    } else if (filter === '7d') {
      query = query.gte('date', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
    } else if (filter === '1m') {
      query = query.gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    }

    const { data, error } = await query.order('date', { ascending: false })
    if (!error && data) setTrades(data as Trade[])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  const stats    = useMemo(() => buildStats(trades), [trades])
  const withData = stats.filter(s => s.total > 0)

  // Sort cards: populated first (by win rate desc), then empty
  const sortedStats = useMemo(() => [
    ...withData.sort((a, b) => b.winRate - a.winRate),
    ...stats.filter(s => s.total === 0),
  ], [stats, withData])

  // Global summary numbers
  const totalTrades  = trades.length
  const totalWins    = trades.filter(t => t.result === 'win').length
  const totalLosses  = trades.filter(t => t.result === 'loss').length
  const globalWR     = totalWins + totalLosses > 0
    ? (totalWins / (totalWins + totalLosses)) * 100 : 0
  const totalPnl     = trades.reduce((s, t) => s + t.pnl, 0)
  const bestDol      = withData.length > 0
    ? withData.reduce((a, b) => b.winRate > a.winRate ? b : a)
    : null

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[#e8eaf0] text-xl font-bold">DOL Stats</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Win rate por tipo de objetivo de liquidez
          </p>
        </div>

        {/* Time filter */}
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

      {/* ── Summary strip ── */}
      {!loading && totalTrades > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryPill label="Trades con DOL" value={String(totalTrades)} />
          <SummaryPill
            label="Win Rate global"
            value={formatPercent(globalWR)}
            valueColor={globalWR >= 60 ? 'text-[#26de81]' : globalWR >= 40 ? 'text-[#f7c948]' : 'text-[#fc5c65]'}
          />
          <SummaryPill
            label="P&L total"
            value={`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`}
            valueColor={totalPnl > 0 ? 'text-[#26de81]' : totalPnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'}
          />
          <SummaryPill
            label="Mejor DOL"
            value={bestDol ? bestDol.dol : '—'}
            sub={bestDol ? `${formatPercent(bestDol.winRate)} WR` : undefined}
            icon={<TrendingUp size={14} className="text-[#26de81]" />}
          />
        </div>
      )}

      {/* ── Cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(9).fill(0).map((_, i) => (
            <div key={i} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedStats.map((stat, i) => (
            <DolCard
              key={stat.dol}
              stat={stat}
              rank={stat.total > 0 ? i + 1 : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Summary table ── */}
      {!loading && <DolTable stats={stats} />}
    </div>
  )
}

// ─── Summary pill ─────────────────────────────────────────────────────────────

interface SummaryPillProps {
  label:      string
  value:      string
  sub?:       string
  valueColor?: string
  icon?:      React.ReactNode
}

function SummaryPill({ label, value, sub, valueColor, icon }: SummaryPillProps) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl px-4 py-3 flex items-center gap-3">
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-[#6b7280] text-xs uppercase tracking-wider truncate">{label}</p>
        <p className={cn('text-lg font-bold leading-tight mt-0.5 truncate', valueColor ?? 'text-[#e8eaf0]')}>
          {value}
        </p>
        {sub && <p className="text-[#6b7280] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
