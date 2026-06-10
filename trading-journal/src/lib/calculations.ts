import type { Symbol, TradeDirection } from '@/types/database'

// Dollar value per point for each instrument
export const POINT_VALUE: Record<Symbol, number> = {
  MNQ: 2,    // $0.50/tick × 4 ticks/point
  NQ:  20,   // $5/tick × 4 ticks/point
  ES:  50,   // $12.50/tick × 4 ticks/point
  MES: 5,    // $1.25/tick × 4 ticks/point
}

export function calcRR(
  direction: TradeDirection,
  entry: number,
  exit: number,
  sl: number,
): number {
  if (direction === 'long') {
    const risk   = entry - sl
    const reward = exit  - entry
    return risk !== 0 ? parseFloat((reward / risk).toFixed(3)) : 0
  } else {
    const risk   = sl    - entry
    const reward = entry - exit
    return risk !== 0 ? parseFloat((reward / risk).toFixed(3)) : 0
  }
}

export function calcPnl(
  direction: TradeDirection,
  entry: number,
  exit: number,
  symbol: Symbol,
): number {
  const multiplier = POINT_VALUE[symbol]
  const points = direction === 'long' ? exit - entry : entry - exit
  return parseFloat((points * multiplier).toFixed(2))
}
