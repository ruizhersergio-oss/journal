'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn, formatCurrency } from '@/lib/utils'
import { parseAndValidateImport, type ImportValidationResult } from '@/lib/import-validation'
import type { TradeType } from '@/types/database'

interface ImportJsonPanelProps {
  onImported: () => void
  onCancel:   () => void
  defaultTradeType?: TradeType
}

export default function ImportJsonPanel({ onImported, onCancel, defaultTradeType = 'real' }: ImportJsonPanelProps) {
  const [rawJson, setRawJson]     = useState('')
  const [results, setResults]     = useState<ImportValidationResult[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handlePreview() {
    setSubmitError(null)
    const { results: parsedResults, parseError: err } = parseAndValidateImport(rawJson, defaultTradeType)
    setParseError(err)
    setResults(err ? null : parsedResults)
  }

  function handleBackToEdit() {
    setResults(null)
    setParseError(null)
    setSubmitError(null)
  }

  const hasErrors = results?.some(r => r.errors.length > 0) ?? false

  async function handleConfirm() {
    if (!results || hasErrors) return
    setImporting(true)
    setSubmitError(null)

    const payload = results.map(r => r.trade!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('trades') as any
    const { error } = await table.insert(payload)

    setImporting(false)
    if (error) {
      setSubmitError(error.message ?? 'Error al insertar los trades')
      return
    }

    setRawJson('')
    setResults(null)
    onImported()
  }

  return (
    <div className="space-y-4">
      {results === null ? (
        <>
          <p className="text-[#6b7280] text-xs">
            Pega un array JSON de trades. Los campos deben venir ya normalizados a los valores
            exactos esperados por la app (símbolos, direction, result, etc.). <code className="text-[#4f8ef7]">pnl</code> y{' '}
            <code className="text-[#4f8ef7]">rr</code> son opcionales — se calculan automáticamente si faltan.
          </p>
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            placeholder='[{"date":"2026-07-01","time":"09:30","symbol":"MNQ","direction":"long","entry_price":19500,"exit_price":19520,"sl_price":19490,"result":"win"}]'
            rows={14}
            spellCheck={false}
            className="w-full bg-[#13151c] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-xs font-mono text-[#e8eaf0] placeholder:text-[#4b5563] focus:outline-none focus:ring-1 focus:ring-[#4f8ef7] resize-y"
          />
          {parseError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#fc5c65]/10 border border-[#fc5c65]/30 rounded-lg text-[#fc5c65] text-xs">
              <AlertCircle size={14} className="shrink-0" />
              {parseError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2a2d3a]">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#e8eaf0] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!rawJson.trim()}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                'bg-[#4f8ef7] hover:bg-[#3d7de6] text-white',
                !rawJson.trim() && 'opacity-60 cursor-not-allowed'
              )}
            >
              Previsualizar
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#2a2d3a]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#13151c] text-[#6b7280] text-left">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Dirección</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">P&L</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-t border-[#2a2d3a]',
                      r.errors.length > 0 ? 'bg-[#fc5c65]/5' : undefined
                    )}
                  >
                    <td className="px-3 py-2 text-[#6b7280]">{i + 1}</td>
                    {r.trade ? (
                      <>
                        <td className="px-3 py-2 text-[#e8eaf0]">{r.trade.date}</td>
                        <td className="px-3 py-2 text-[#e8eaf0]">{r.trade.symbol}</td>
                        <td className="px-3 py-2 text-[#e8eaf0] capitalize">{r.trade.direction}</td>
                        <td className="px-3 py-2 text-[#e8eaf0] uppercase">{r.trade.result}</td>
                        <td className={cn(
                          'px-3 py-2 font-medium',
                          r.trade.pnl >= 0 ? 'text-[#26de81]' : 'text-[#fc5c65]'
                        )}>
                          {r.trade.pnl >= 0 ? '+' : ''}{formatCurrency(r.trade.pnl)}
                        </td>
                        <td className="px-3 py-2 text-[#26de81]">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={13} /> OK
                          </span>
                        </td>
                      </>
                    ) : (
                      <td colSpan={6} className="px-3 py-2 text-[#fc5c65]">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle size={13} className="shrink-0 mt-0.5" />
                          <span>{r.errors.join(' · ')}</span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#6b7280]">
            {results.length} trade{results.length !== 1 ? 's' : ''} en el JSON
            {hasErrors && (
              <span className="text-[#fc5c65]"> — corrige los errores marcados antes de importar</span>
            )}
          </p>

          {submitError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#fc5c65]/10 border border-[#fc5c65]/30 rounded-lg text-[#fc5c65] text-xs">
              <AlertCircle size={14} className="shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2a2d3a]">
            <button
              type="button"
              onClick={handleBackToEdit}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#e8eaf0] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
            >
              Volver a editar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#6b7280] hover:text-[#e8eaf0] border border-[#2a2d3a] hover:border-[#3a3d4a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={hasErrors || importing}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                'bg-[#4f8ef7] hover:bg-[#3d7de6] text-white',
                (hasErrors || importing) && 'opacity-60 cursor-not-allowed'
              )}
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              Confirmar import
            </button>
          </div>
        </>
      )}
    </div>
  )
}
