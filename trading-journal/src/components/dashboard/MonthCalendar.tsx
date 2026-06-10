'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, getDay, isSameMonth, isToday, subMonths, addMonths,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { DayData } from '@/hooks/useMetrics'

interface MonthCalendarProps {
  dayMap: Map<string, DayData>
  showR?: boolean
  unit?:  'currency' | 'R'
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function MonthCalendar({ dayMap, showR = false, unit = 'currency' }: MonthCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Monday-first offset
  const startDow = (getDay(monthStart) + 6) % 7

  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...days,
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const netMonth = Array.from(dayMap.values())
    .filter(d => d.date.startsWith(format(currentDate, 'yyyy-MM')))
    .reduce((s, d) => s + d.pnl, 0)

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]">
        <button
          onClick={() => setCurrentDate(d => subMonths(d, 1))}
          className="p-1.5 rounded-lg hover:bg-[#1f2230] text-[#6b7280] hover:text-[#e8eaf0] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-[#e8eaf0] font-semibold text-base">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <span
            className={cn(
              'text-sm font-medium',
              netMonth > 0 && 'text-[#26de81]',
              netMonth < 0 && 'text-[#fc5c65]',
              netMonth === 0 && 'text-[#6b7280]'
            )}
          >
            {unit === 'R'
              ? `${netMonth >= 0 ? '+' : ''}${netMonth.toFixed(2)}R`
              : `${netMonth >= 0 ? '+' : ''}${formatCurrency(netMonth)}`
            }
          </span>
        </div>

        <button
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          className="p-1.5 rounded-lg hover:bg-[#1f2230] text-[#6b7280] hover:text-[#e8eaf0] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-[#2a2d3a]">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-[#6b7280] text-xs font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="border-b border-r border-[#2a2d3a] min-h-[80px]" />
          }

          const key      = format(date, 'yyyy-MM-dd')
          const data     = dayMap.get(key)
          const isToday_ = isToday(date)
          const inMonth  = isSameMonth(date, currentDate)

          const hasTrades = !!data
          const isPos     = hasTrades && data.pnl > 0
          const isNeg     = hasTrades && data.pnl < 0

          return (
            <div
              key={key}
              className={cn(
                'border-b border-r border-[#2a2d3a] min-h-[80px] p-2 flex flex-col transition-colors',
                !inMonth && 'opacity-30',
                hasTrades && isPos && 'bg-[#26de81]/5 hover:bg-[#26de81]/10',
                hasTrades && isNeg && 'bg-[#fc5c65]/5 hover:bg-[#fc5c65]/10',
                !hasTrades && 'hover:bg-[#1f2230]',
                isToday_ && 'ring-1 ring-inset ring-[#4f8ef7]/50'
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                    isToday_
                      ? 'bg-[#4f8ef7] text-white'
                      : 'text-[#6b7280]'
                  )}
                >
                  {format(date, 'd')}
                </span>
                {hasTrades && (
                  <span className="text-[10px] text-[#6b7280]">{data.trades}t</span>
                )}
              </div>

              {/* P&L */}
              {hasTrades && (
                <>
                  <span
                    className={cn(
                      'text-xs font-bold leading-none',
                      isPos ? 'text-[#26de81]' : 'text-[#fc5c65]'
                    )}
                  >
                    {unit === 'R'
                      ? `${data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(2)}R`
                      : showR
                        ? `${data.pnl >= 0 ? '+' : ''}${(data.pnl / 100).toFixed(1)}R`
                        : `${data.pnl >= 0 ? '+' : ''}${formatCurrency(data.pnl)}`
                    }
                  </span>
                  <span className="text-[10px] text-[#6b7280] mt-0.5">
                    {formatPercent(data.winRate)}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
