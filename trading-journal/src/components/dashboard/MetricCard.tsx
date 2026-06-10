import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'positive' | 'negative' | 'neutral'
  highlight?: boolean
}

export default function MetricCard({ label, value, sub, trend = 'neutral', highlight }: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 flex flex-col gap-1',
        highlight && 'border-[#4f8ef7]/40'
      )}
    >
      <span className="text-[#6b7280] text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          'text-2xl font-bold leading-none mt-1',
          trend === 'positive' && 'text-[#26de81]',
          trend === 'negative' && 'text-[#fc5c65]',
          trend === 'neutral'  && 'text-[#e8eaf0]'
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[#6b7280] text-xs">{sub}</span>
      )}
    </div>
  )
}
