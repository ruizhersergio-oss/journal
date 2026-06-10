'use client'

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { DayData } from '@/hooks/useMetrics'
import { formatCurrency } from '@/lib/utils'

interface PnlChartsProps {
  dayMap: Map<string, DayData>
  showR?: boolean
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function PnlCharts({ dayMap, showR }: PnlChartsProps) {
  // Cumulative curve
  const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  let cumulative = 0
  const cumulativeData = sortedDays.map(d => {
    cumulative += d.pnl
    return {
      date:       format(parseISO(d.date), 'dd MMM'),
      cumulative,
      daily:      d.pnl,
    }
  })

  // By day of week
  const dowData = DOW_LABELS.map((label, dow) => {
    const daysOfDow = sortedDays.filter(d => new Date(d.date).getDay() === dow)
    const total     = daysOfDow.reduce((s, d) => s + d.pnl, 0)
    return { label, total, count: daysOfDow.length }
  })

  const formatVal = (v: number) =>
    showR ? `${v >= 0 ? '+' : ''}${(v / 100).toFixed(1)}R` : formatCurrency(v)

  interface TooltipEntry { name: string; value: number; color: string }
  interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg px-3 py-2 text-xs">
        <p className="text-[#6b7280] mb-1">{label}</p>
        {payload.map((p: TooltipEntry) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatVal(p.value)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Cumulative P&L */}
      <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-[#e8eaf0] text-sm font-semibold mb-4">P&L Acumulado</h3>
        {cumulativeData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-[#6b7280] text-sm">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cumulativeData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => formatCurrency(v).replace('$', '$')}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="#4f8ef7"
                strokeWidth={2}
                fill="url(#pnlGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By day of week */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-[#e8eaf0] text-sm font-semibold mb-4">P&L por día</h3>
        {sortedDays.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-[#6b7280] text-sm">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={55}
                tickFormatter={v => formatCurrency(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="P&L" radius={[4, 4, 0, 0]}>
                {dowData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.total >= 0 ? '#26de81' : '#fc5c65'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
