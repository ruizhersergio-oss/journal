import { useMemo } from 'react'
import type { Trade } from '@/types/database'

export interface DayData {
  date:    string
  pnl:     number   // real trades only
  trades:  number   // all (real + demo_destacado)
  wins:    number   // all
  losses:  number   // all
  winRate: number   // all
  hasReal: boolean
  hasDemo: boolean
}

export interface Metrics {
  netPnl:        number
  winRate:       number
  avgRR:         number
  profitFactor:  number
  avgWin:        number
  avgLoss:       number
  winDays:       number
  lossDays:      number
  currentStreak: number
  streakType:    'win' | 'loss' | 'none'
  totalTrades:   number
  totalR:        number
}

export function useMetrics(trades: Trade[]) {
  return useMemo(() => {
    const metrics: Metrics = {
      netPnl: 0, winRate: 0, avgRR: 0, profitFactor: 0,
      avgWin: 0, avgLoss: 0, winDays: 0, lossDays: 0,
      currentStreak: 0, streakType: 'none', totalTrades: 0, totalR: 0,
    }

    if (trades.length === 0) return { metrics, dayMap: new Map<string, DayData>() }

    // Split by type
    const realTrades = trades.filter(t => (t.trade_type ?? 'real') === 'real')
    const demoTrades = trades.filter(t => t.trade_type === 'demo_destacado')
    const rateTrades = [...realTrades, ...demoTrades]  // used for WR, avgRR, PF

    const rateWins   = rateTrades.filter(t => t.result === 'win')
    const rateLosses = rateTrades.filter(t => t.result === 'loss')
    const realWins   = realTrades.filter(t => t.result === 'win')
    const realLosses = realTrades.filter(t => t.result === 'loss')

    // P&L metrics — real only
    metrics.netPnl  = realTrades.reduce((s, t) => s + t.pnl, 0)
    metrics.avgWin  = realWins.length > 0
      ? realWins.reduce((s, t) => s + t.pnl, 0) / realWins.length : 0
    metrics.avgLoss = realLosses.length > 0
      ? Math.abs(realLosses.reduce((s, t) => s + t.pnl, 0) / realLosses.length) : 0

    // Rate metrics — real + demo_destacado
    metrics.totalTrades = rateTrades.length
    metrics.totalR      = rateTrades.reduce((s, t) => s + t.rr, 0)
    metrics.winRate     = (rateWins.length + rateLosses.length) > 0
      ? (rateWins.length / (rateWins.length + rateLosses.length)) * 100 : 0
    metrics.avgRR = rateTrades.length > 0 ? metrics.totalR / rateTrades.length : 0

    // Profit factor — RR-based, real + demo_destacado
    const grossWinRR  = rateWins.reduce((s, t) => s + Math.abs(t.rr), 0)
    const grossLossRR = rateLosses.reduce((s, t) => s + Math.abs(t.rr), 0)
    metrics.profitFactor = grossLossRR > 0
      ? grossWinRR / grossLossRR
      : grossWinRR > 0 ? 999 : 0

    // Build day map
    const dayMap = new Map<string, DayData>()

    for (const t of trades) {
      const isReal = (t.trade_type ?? 'real') === 'real'
      const isDemo = t.trade_type === 'demo_destacado'
      if (!isReal && !isDemo) continue  // ignore backtest

      const existing = dayMap.get(t.date) ?? {
        date: t.date, pnl: 0, trades: 0, wins: 0, losses: 0, winRate: 0,
        hasReal: false, hasDemo: false,
      }
      if (isReal) existing.pnl += t.pnl  // P&L real only
      existing.trades += 1
      if (t.result === 'win')  existing.wins  += 1
      if (t.result === 'loss') existing.losses += 1
      if (isReal) existing.hasReal = true
      if (isDemo) existing.hasDemo = true
      dayMap.set(t.date, existing)
    }

    for (const day of Array.from(dayMap.values())) {
      const denominator = day.wins + day.losses
      day.winRate = denominator > 0 ? (day.wins / denominator) * 100 : 0
      // Win/loss days based on real P&L only
      if (day.hasReal) {
        if (day.pnl > 0) metrics.winDays  += 1
        if (day.pnl < 0) metrics.lossDays += 1
      }
    }

    // Current streak — real-trade days only
    const sortedDays = Array.from(dayMap.values())
      .filter(d => d.hasReal)
      .sort((a, b) => b.date.localeCompare(a.date))

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
