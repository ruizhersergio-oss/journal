import { cn, formatCurrency } from '@/lib/utils'
import type { DolType } from '@/types/database'

const DOL_LABELS: Record<DolType, { short: string; description: string; group?: string }> = {
  // Asia Session
  'Asia High':           { short: 'AH',   description: 'Asia High',                group: 'Asia' },
  'Asia Low':            { short: 'AL',   description: 'Asia Low',                 group: 'Asia' },
  // London Session
  'London High':         { short: 'LH',   description: 'London High',              group: 'LON' },
  'London Low':          { short: 'LL',   description: 'London Low',               group: 'LON' },
  // NY Session
  'NY High':             { short: 'NYH',  description: 'NY High',                  group: 'NY' },
  'NY Low':              { short: 'NYL',  description: 'NY Low',                   group: 'NY' },
  'NY Opening Gap':      { short: 'NYOG', description: 'NY Opening Gap',           group: 'NY' },
  // Liquidez ICT
  'SSL':                 { short: 'SSL',  description: 'Sell Side Liquidity',      group: 'ICT' },
  'BSL':                 { short: 'BSL',  description: 'Buy Side Liquidity',       group: 'ICT' },
  'Equal Highs':         { short: 'EQH',  description: 'Equal Highs',              group: 'ICT' },
  'Equal Lows':          { short: 'EQL',  description: 'Equal Lows',               group: 'ICT' },
  'Relative Equal Highs':{ short: 'REH',  description: 'Relative Equal Highs',     group: 'ICT' },
  'Relative Equal Lows': { short: 'REL',  description: 'Relative Equal Lows',      group: 'ICT' },
  'Old High':            { short: 'OH',   description: 'Old High',                 group: 'ICT' },
  'Old Low':             { short: 'OL',   description: 'Old Low',                  group: 'ICT' },
  'Daily High':          { short: 'DaH',  description: 'Daily High',               group: 'ICT' },
  'Daily Low':           { short: 'DaL',  description: 'Daily Low',                group: 'ICT' },
  'Weekly High':         { short: 'WH',   description: 'Weekly High',              group: 'ICT' },
  'Weekly Low':          { short: 'WL',   description: 'Weekly Low',               group: 'ICT' },
  'Monthly High':        { short: 'MoH',  description: 'Monthly High',             group: 'ICT' },
  'Monthly Low':         { short: 'MoL',  description: 'Monthly Low',              group: 'ICT' },
  // Volume Profile
  'POC Diario':          { short: 'POCd', description: 'POC Diario',               group: 'VP' },
  'POC Semanal':         { short: 'POCw', description: 'POC Semanal',              group: 'VP' },
  'POC Mensual':         { short: 'POCm', description: 'POC Mensual',              group: 'VP' },
  'POC Ayer':            { short: 'POCy', description: 'POC Ayer',                 group: 'VP' },
  'VAH':                 { short: 'VAH',  description: 'Value Area High',          group: 'VP' },
  'VAL':                 { short: 'VAL',  description: 'Value Area Low',           group: 'VP' },
  'HVN':                 { short: 'HVN',  description: 'High Volume Node',         group: 'VP' },
  'LVN':                 { short: 'LVN',  description: 'Low Volume Node',          group: 'VP' },
  // Estructura
  'Previous Day High':   { short: 'PDH',  description: 'Previous Day High',        group: 'EST' },
  'Previous Day Low':    { short: 'PDL',  description: 'Previous Day Low',         group: 'EST' },
  'Previous Week High':  { short: 'PWH',  description: 'Previous Week High',       group: 'EST' },
  'Previous Week Low':   { short: 'PWL',  description: 'Previous Week Low',        group: 'EST' },
  // Legacy
  'Data Highs':          { short: 'DH',   description: 'Data Highs',               group: 'ICT' },
  'Data Lows':           { short: 'DL',   description: 'Data Lows',                group: 'ICT' },
}

export interface DolStat {
  dol:     DolType
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
                label.group === 'VP'  ? 'bg-[#a855f7]/10 text-[#a855f7]' :
                label.group === 'NY'  ? 'bg-[#4f8ef7]/10 text-[#4f8ef7]' :
                label.group === 'LON' ? 'bg-[#26de81]/10 text-[#26de81]' :
                label.group === 'Asia'? 'bg-[#f7c948]/10 text-[#f7c948]' :
                label.group === 'EST' ? 'bg-[#fc5c65]/10 text-[#fc5c65]' :
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
