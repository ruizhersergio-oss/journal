import { cn, formatCurrency } from '@/lib/utils'
import type { TargetType } from '@/types/database'

const DOL_LABELS: Record<TargetType, { short: string; description: string; group?: string }> = {
  // Big Trades
  'Big Trade Comprador': { short: 'BTc',  description: 'Big Trade Comprador',      group: 'BIG' },
  'Big Trade Vendedor':  { short: 'BTv',  description: 'Big Trade Vendedor',       group: 'BIG' },
  'Big Trade':           { short: 'BT',   description: 'Big Trade',                group: 'BIG' },
  // VAL
  'VAL diario':          { short: 'VALdi', description: 'VAL diario',             group: 'VAL' },
  'VAL RTH':             { short: 'VALr', description: 'VAL RTH',                  group: 'VAL' },
  'VAL día anterior':    { short: 'VALd', description: 'VAL día anterior',         group: 'VAL' },
  'VAL horario':         { short: 'VALh', description: 'VAL horario',              group: 'VAL' },
  'VAL semanal':         { short: 'VALw', description: 'VAL semanal',              group: 'VAL' },
  'VAL mensual':         { short: 'VALm', description: 'VAL mensual',              group: 'VAL' },
  // VAH
  'VAH diario':          { short: 'VAHdi', description: 'VAH diario',             group: 'VAH' },
  'VAH RTH':             { short: 'VAHr', description: 'VAH RTH',                  group: 'VAH' },
  'VAH día anterior':    { short: 'VAHd', description: 'VAH día anterior',         group: 'VAH' },
  'VAH horario':         { short: 'VAHh', description: 'VAH horario',              group: 'VAH' },
  'VAH semanal':         { short: 'VAHw', description: 'VAH semanal',              group: 'VAH' },
  'VAH mensual':         { short: 'VAHm', description: 'VAH mensual',              group: 'VAH' },
  // POC
  'POC horario':         { short: 'POCh', description: 'POC horario',              group: 'POC' },
  'POC diario':          { short: 'POCd', description: 'POC diario',               group: 'POC' },
  'POC semanal':         { short: 'POCw', description: 'POC semanal',              group: 'POC' },
  'POC mensual':         { short: 'POCm', description: 'POC mensual',              group: 'POC' },
  // VWAP
  'VWAP ETH':            { short: 'VWe',  description: 'VWAP ETH',                 group: 'VWAP' },
  'VWAP RTH':             { short: 'VWr',  description: 'VWAP RTH',                 group: 'VWAP' },
  'VWAP día anterior':   { short: 'VWd',  description: 'VWAP día anterior',        group: 'VWAP' },
  'VWAP semanal':        { short: 'VWw',  description: 'VWAP semanal',             group: 'VWAP' },
  'VWAP mensual':        { short: 'VWm',  description: 'VWAP mensual',             group: 'VWAP' },
  // Initial Balance
  'IB High 30min':       { short: 'IBH30',description: 'IB High 30min',            group: 'IB' },
  'IB High 1h':          { short: 'IBH1h',description: 'IB High 1h',               group: 'IB' },
  'IB Low 30min':        { short: 'IBL30',description: 'IB Low 30min',             group: 'IB' },
  'IB Low 1h':           { short: 'IBL1h',description: 'IB Low 1h',                group: 'IB' },
  // Nodos
  'HVN':                 { short: 'HVN',  description: 'High Volume Node',         group: 'Nodos' },
  'LVN':                 { short: 'LVN',  description: 'Low Volume Node',          group: 'Nodos' },
  // TPO
  'TPO':                 { short: 'TPO',  description: 'Time Price Opportunity',   group: 'TPO' },
  // Gaps
  'NDOG':                { short: 'NDOG', description: 'New Day Opening Gap',      group: 'Gaps' },
  'NWOG':                { short: 'NWOG', description: 'New Week Opening Gap',     group: 'Gaps' },
  'NMOG':                { short: 'NMOG', description: 'New Month Opening Gap',    group: 'Gaps' },
}

export interface DolStat {
  dol:     TargetType
  total:   number
  wins:    number
  losses:  number
  be:      number
  winRate: number
  avgRR:   number
  pnl:     number
}

interface DolCardProps {
  stat:    DolStat
  rank?:   number
}

export default function DolCard({ stat, rank }: DolCardProps) {
  const label = DOL_LABELS[stat.dol]
  const isEmpty = stat.total === 0

  const wrColor = isEmpty
    ? 'text-[#6b7280]'
    : stat.winRate >= 60
      ? 'text-[#26de81]'
      : stat.winRate >= 40
        ? 'text-[#f7c948]'
        : 'text-[#fc5c65]'

  const wrBg = isEmpty
    ? 'bg-[#2a2d3a]/40'
    : stat.winRate >= 60
      ? 'bg-[#26de81]/8'
      : stat.winRate >= 40
        ? 'bg-[#f7c948]/8'
        : 'bg-[#fc5c65]/8'

  const wrBorder = isEmpty
    ? 'border-[#2a2d3a]'
    : stat.winRate >= 60
      ? 'border-[#26de81]/20'
      : stat.winRate >= 40
        ? 'border-[#f7c948]/20'
        : 'border-[#fc5c65]/20'

  return (
    <div className={cn(
      'bg-[#1a1d27] border rounded-xl p-5 flex flex-col gap-4 transition-colors',
      isEmpty ? 'border-[#2a2d3a] opacity-60' : wrBorder,
    )}>
      {/* Top row: acronym + rank badge */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded font-mono',
              isEmpty ? 'bg-[#2a2d3a] text-[#6b7280]' : `${wrBg} ${wrColor}`,
            )}>
              {label.short}
            </span>
            {label.group && (
              <span className={cn(
                'text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider',
                label.group === 'BIG'   ? 'bg-[#fc5c65]/10 text-[#fc5c65]' :
                label.group === 'VAL'   ? 'bg-[#26de81]/10 text-[#26de81]' :
                label.group === 'VAH'   ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]' :
                label.group === 'POC'   ? 'bg-[#a855f7]/10 text-[#a855f7]' :
                label.group === 'VWAP'  ? 'bg-[#f7c948]/10 text-[#f7c948]' :
                label.group === 'IB'    ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                label.group === 'Nodos' ? 'bg-[#22d3ee]/10 text-[#22d3ee]' :
                label.group === 'TPO'   ? 'bg-[#ec4899]/10 text-[#ec4899]' :
                'bg-[#4b5563]/20 text-[#6b7280]'
              )}>
                {label.group}
              </span>
            )}
            {rank && !isEmpty && (
              <span className="text-[10px] text-[#4b5563]">#{rank}</span>
            )}
          </div>
          <p className="text-[#e8eaf0] text-sm font-semibold mt-1">{label.description}</p>
        </div>

        {/* Win rate arc */}
        {!isEmpty && (
          <WinRateArc rate={stat.winRate} color={wrColor} />
        )}
      </div>

      {isEmpty ? (
        <p className="text-[#4b5563] text-xs">Sin datos en el período seleccionado</p>
      ) : (
        <>
          {/* Win/loss bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6b7280]">{stat.wins}W / {stat.losses}L{stat.be > 0 ? ` / ${stat.be}BE` : ''}</span>
              <span className="text-[#6b7280]">{stat.total} trades</span>
            </div>
            <div className="h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden flex">
              {stat.wins > 0 && (
                <div
                  className="h-full bg-[#26de81] rounded-l-full transition-all"
                  style={{ width: `${(stat.wins / stat.total) * 100}%` }}
                />
              )}
              {stat.be > 0 && (
                <div
                  className="h-full bg-[#f7c948]"
                  style={{ width: `${(stat.be / stat.total) * 100}%` }}
                />
              )}
              {stat.losses > 0 && (
                <div
                  className="h-full bg-[#fc5c65] rounded-r-full"
                  style={{ width: `${(stat.losses / stat.total) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#13151c] rounded-lg px-3 py-2">
              <p className="text-[#6b7280] text-[10px] uppercase tracking-wider">Avg RR (wins)</p>
              <p className={cn(
                'text-sm font-bold mt-0.5',
                stat.avgRR > 0 ? 'text-[#26de81]' : 'text-[#6b7280]'
              )}>
                {stat.avgRR > 0 ? `+${stat.avgRR.toFixed(2)}R` : '—'}
              </p>
            </div>
            <div className="bg-[#13151c] rounded-lg px-3 py-2">
              <p className="text-[#6b7280] text-[10px] uppercase tracking-wider">P&L Total</p>
              <p className={cn(
                'text-sm font-bold mt-0.5',
                stat.pnl > 0 ? 'text-[#26de81]' : stat.pnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'
              )}>
                {stat.pnl >= 0 ? '+' : ''}{formatCurrency(stat.pnl)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Small SVG arc showing win rate ──────────────────────────────────────────

function WinRateArc({ rate, color }: { rate: number; color: string }) {
  const r      = 18
  const cx     = 22
  const cy     = 22
  const stroke = 3
  const circ   = 2 * Math.PI * r
  const dash   = (rate / 100) * circ

  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2d3a" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-[10px] font-bold', color)}>
        {rate.toFixed(0)}%
      </span>
    </div>
  )
}
