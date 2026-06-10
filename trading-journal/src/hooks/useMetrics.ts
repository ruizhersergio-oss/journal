import { useMemo } from 'react'
import type { Trade } from '@/types/database'

export interface DayData {
  date: string
  pnl: number
  trades: number
  wins: number
  losses: number
  winRate: number
}

export interface Metrics {
  netPnl: number
  winRate: number
  avgRR: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  winDays: number
  lossDays: number
  currentStreak: number
  streakType: 'win' | 'loss' | 'none'
  totalTrades: number
  totalR: number
}

export function useMetrics(trades: Trade[]) {
  return useMemo(() => {
    const metrics: Metrics = {
      netPnl: 0,
      winRate: 0,
      avgRR: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      winDays: 0,
      lossDays: 0,
      currentStreak: 0,
      streakType: 'none',
      totalTrades: trades.length,
      totalR: 0,
    }

    if (trades.length === 0) return { metrics, dayMap: new Map<string, DayData>() }

    const wins   = trades.filter(t => t.result === 'win')
    const losses = trades.filter(t => t.result === 'loss')

    metrics.netPnl       = trades.reduce((sum, t) => sum + t.pnl, 0)
    metrics.totalR       = trades.reduce((sum, t) => sum + t.rr, 0)
    metrics.winRate      = trades.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0
    metrics.avgRR        = trades.length > 0 ? metrics.totalR / trades.length : 0
    metrics.avgWin       = wins.length > 0   ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    metrics.avgLoss      = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0

    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    metrics.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

    // Build day map
    const dayMap = new Map<string, DayData>()
    for (const t of trades) {
      const existing = dayMap.get(t.date) ?? {
        date: t.date, pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0,
      }
      existing.pnl    += t.pnl
      existing.trades += 1
      if (t.result === 'win')  existing.wins  += 1
      if (t.result === 'loss') existing.losses += 1
      dayMap.set(t.date, existing)
    }

    for (const day of Array.from(dayMap.values())) {
      const denominator = day.wins + day.losses
      day.winRate = denominator > 0 ? (day.wins / denominator) * 100 : 0
      if (day.pnl > 0) metrics.winDays  += 1
      if (day.pnl < 0) metrics.lossDays += 1
    }

    // Current streak (sorted by date desc)
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date))
    if (sortedDays.length > 0) {
      const firstType = sortedDays[0].pnl > 0 ? 'win' : 'loss'
      metrics.streakType = firstType
      let streak = 0
      for (const day of sortedDays) {
        const isWin = day.pnl > 0
        if ((firstType === 'win' && isWin) || (firstType === 'loss' && !isWin)) {
          streak++
        } else {
          break
        }
      }
      metrics.currentStreak = streak
    }

    return { metrics, dayMap }
  }, [trades])
}
