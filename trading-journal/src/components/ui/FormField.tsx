import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({ label, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">
        {label}
        {required && <span className="text-[#fc5c65] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[#fc5c65] text-xs">{error}</p>}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        'w-full bg-[#13151c] border rounded-lg px-3 py-2.5 text-sm text-[#e8eaf0] placeholder-[#4b5563]',
        'focus:outline-none focus:ring-1 focus:ring-[#4f8ef7] focus:border-[#4f8ef7]',
        'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-[#fc5c65]' : 'border-[#2a2d3a] hover:border-[#3a3d4a]',
        className,
      )}
    />
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full bg-[#13151c] border rounded-lg px-3 py-2.5 text-sm text-[#e8eaf0] placeholder-[#4b5563]',
        'focus:outline-none focus:ring-1 focus:ring-[#4f8ef7] focus:border-[#4f8ef7]',
        'transition-colors resize-none',
        error ? 'border-[#fc5c65]' : 'border-[#2a2d3a] hover:border-[#3a3d4a]',
        className,
      )}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function Select({ error, className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cn(
        'w-full bg-[#13151c] border rounded-lg px-3 py-2.5 text-sm text-[#e8eaf0]',
        'focus:outline-none focus:ring-1 focus:ring-[#4f8ef7] focus:border-[#4f8ef7]',
        'transition-colors cursor-pointer appearance-none',
        error ? 'border-[#fc5c65]' : 'border-[#2a2d3a] hover:border-[#3a3d4a]',
        className,
      )}
    >
      {children}
    </select>
  )
}
