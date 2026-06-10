import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import type { DolStat } from './DolCard'

interface DolTableProps {
  stats: DolStat[]
}

export default function DolTable({ stats }: DolTableProps) {
  const withData = [...stats]
    .filter(s => s.total > 0)
    .sort((a, b) => b.winRate - a.winRate)

  if (withData.length === 0) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-10 text-center text-[#6b7280] text-sm">
        No hay trades con DOL registrado en el período seleccionado.
      </div>
    )
  }

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a2d3a]">
        <h3 className="text-[#e8eaf0] font-semibold text-sm">Tabla resumen</h3>
        <p className="text-[#6b7280] text-xs mt-0.5">Ordenado por win rate descendente</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3a]">
              {['#', 'DOL', 'Trades', 'Wins', 'Losses', 'Win Rate', 'Avg RR', 'P&L Total'].map(h => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[#6b7280] text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3a]">
            {withData.map((s, i) => {
              const wrColor =
                s.winRate >= 60 ? 'text-[#26de81]'
                : s.winRate >= 40 ? 'text-[#f7c948]'
                : 'text-[#fc5c65]'

              const wrBg =
                s.winRate >= 60 ? 'bg-[#26de81]/10'
                : s.winRate >= 40 ? 'bg-[#f7c948]/10'
                : 'bg-[#fc5c65]/10'

              return (
                <tr key={s.dol} className="hover:bg-[#1f2230] transition-colors">
                  <td className="px-5 py-3.5 text-[#4b5563] text-xs font-mono">{i + 1}</td>

                  <td className="px-5 py-3.5">
                    <span className="text-[#e8eaf0] font-medium">{s.dol}</span>
                  </td>

                  <td className="px-5 py-3.5 text-[#e8eaf0] font-mono">{s.total}</td>

                  <td className="px-5 py-3.5">
                    <span className="text-[#26de81] font-mono">{s.wins}</span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="text-[#fc5c65] font-mono">{s.losses}</span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                      wrBg, wrColor
                    )}>
                      {formatPercent(s.winRate)}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'text-xs font-semibold font-mono',
                      s.avgRR > 0 ? 'text-[#26de81]' : 'text-[#6b7280]'
                    )}>
                      {s.avgRR > 0 ? `+${s.avgRR.toFixed(2)}R` : '—'}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'text-sm font-bold',
                      s.pnl > 0 ? 'text-[#26de81]' : s.pnl < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]'
                    )}>
                      {s.pnl >= 0 ? '+' : ''}{formatCurrency(s.pnl)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-[#3a3d4a] bg-[#13151c]/50">
              <td className="px-5 py-3.5" colSpan={2}>
                <span className="text-[#6b7280] text-xs font-medium uppercase tracking-wider">Total</span>
              </td>
              <td className="px-5 py-3.5 text-[#e8eaf0] font-bold font-mono">
                {withData.reduce((s, d) => s + d.total, 0)}
              </td>
              <td className="px-5 py-3.5 text-[#26de81] font-bold font-mono">
                {withData.reduce((s, d) => s + d.wins, 0)}
              </td>
              <td className="px-5 py-3.5 text-[#fc5c65] font-bold font-mono">
                {withData.reduce((s, d) => s + d.losses, 0)}
              </td>
              <td className="px-5 py-3.5">
                {(() => {
                  const totalW = withData.reduce((s, d) => s + d.wins, 0)
                  const totalL = withData.reduce((s, d) => s + d.losses, 0)
                  const wr = totalW + totalL > 0 ? (totalW / (totalW + totalL)) * 100 : 0
                  const c = wr >= 60 ? 'bg-[#26de81]/10 text-[#26de81]' : wr >= 40 ? 'bg-[#f7c948]/10 text-[#f7c948]' : 'bg-[#fc5c65]/10 text-[#fc5c65]'
                  return (
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold', c)}>
                      {formatPercent(wr)}
                    </span>
                  )
                })()}
              </td>
              <td className="px-5 py-3.5 text-[#6b7280] text-xs font-mono">—</td>
              <td className="px-5 py-3.5">
                {(() => {
                  const total = withData.reduce((s, d) => s + d.pnl, 0)
                  return (
                    <span className={cn('text-sm font-bold', total > 0 ? 'text-[#26de81]' : total < 0 ? 'text-[#fc5c65]' : 'text-[#6b7280]')}>
                      {total >= 0 ? '+' : ''}{formatCurrency(total)}
                    </span>
                  )
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
