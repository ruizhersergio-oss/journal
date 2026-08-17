import { calcPnl, calcRR } from '@/lib/calculations'
import {
  SYMBOLS, TRADE_DIRECTIONS, TRADE_RESULTS, TRADE_TYPES,
  TARGET_TYPES, KILL_ZONES,
} from '@/types/database'
import type {
  Symbol, TradeDirection, TradeResult, TradeType,
  TargetType, KillZone, Trade,
} from '@/types/database'

export type TradeImportPayload = Omit<Trade, 'id' | 'created_at'>

export interface ImportValidationResult {
  trade: TradeImportPayload | null
  errors: string[]
}

function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateImportTrade(raw: unknown, defaultTradeType: TradeType = 'real'): ImportValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { trade: null, errors: ['El elemento no es un objeto JSON válido'] }
  }
  const r = raw as Record<string, unknown>

  if (typeof r.date !== 'string' || !r.date) errors.push("'date' requerido (string)")
  if (typeof r.time !== 'string' || !r.time) errors.push("'time' requerido (string)")

  if (!isOneOf<Symbol>(SYMBOLS, r.symbol)) {
    errors.push(`'symbol' inválido: ${JSON.stringify(r.symbol)} (esperado: ${SYMBOLS.join(', ')})`)
  }
  if (!isOneOf<TradeDirection>(TRADE_DIRECTIONS, r.direction)) {
    errors.push(`'direction' inválido: ${JSON.stringify(r.direction)} (esperado: ${TRADE_DIRECTIONS.join(', ')})`)
  }
  if (!isOneOf<TradeResult>(TRADE_RESULTS, r.result)) {
    errors.push(`'result' inválido: ${JSON.stringify(r.result)} (esperado: ${TRADE_RESULTS.join(', ')})`)
  }

  const tradeTypeRaw = r.trade_type ?? defaultTradeType
  if (!isOneOf<TradeType>(TRADE_TYPES, tradeTypeRaw)) {
    errors.push(`'trade_type' inválido: ${JSON.stringify(r.trade_type)} (esperado: ${TRADE_TYPES.join(', ')})`)
  }

  if (!isFiniteNumber(r.entry_price)) errors.push("'entry_price' requerido (number)")
  if (!isFiniteNumber(r.exit_price))  errors.push("'exit_price' requerido (number)")
  if (!isFiniteNumber(r.sl_price))    errors.push("'sl_price' requerido (number)")

  const contractsRaw = r.contracts ?? 1
  if (!isFiniteNumber(contractsRaw) || contractsRaw < 1) {
    errors.push(`'contracts' inválido: ${JSON.stringify(r.contracts)} (esperado: number >= 1)`)
  }

  let target: TargetType | null = null
  if (r.target !== undefined && r.target !== null) {
    if (!isOneOf<TargetType>(TARGET_TYPES, r.target)) {
      errors.push(`'target' inválido: ${JSON.stringify(r.target)}`)
    } else {
      target = r.target
    }
  }

  let killZone: KillZone | null = null
  if (r.kill_zone !== undefined && r.kill_zone !== null) {
    if (!isOneOf<KillZone>(KILL_ZONES, r.kill_zone)) {
      errors.push(`'kill_zone' inválido: ${JSON.stringify(r.kill_zone)} (esperado: ${KILL_ZONES.join(', ')})`)
    } else {
      killZone = r.kill_zone
    }
  }

  let confluences: string[] = []
  if (r.confluences !== undefined && r.confluences !== null) {
    if (!Array.isArray(r.confluences)) {
      errors.push("'confluences' debe ser un array")
    } else {
      const badConfluences = r.confluences.filter(c => typeof c !== 'string' || !c.trim())
      if (badConfluences.length > 0) {
        errors.push(`'confluences' contiene valores inválidos: ${badConfluences.map(c => JSON.stringify(c)).join(', ')}`)
      } else {
        confluences = r.confluences as string[]
      }
    }
  }

  for (const key of ['image_url', 'image_url_2', 'image_url_3', 'image_url_4', 'image_url_5'] as const) {
    if (r[key] !== undefined && r[key] !== null && typeof r[key] !== 'string') {
      errors.push(`'${key}' debe ser string o null`)
    }
  }

  for (const key of ['comment', 'notes'] as const) {
    if (r[key] !== undefined && r[key] !== null && typeof r[key] !== 'string') {
      errors.push(`'${key}' debe ser string o null`)
    }
  }

  if (errors.length > 0) return { trade: null, errors }

  const symbol      = r.symbol as Symbol
  const direction    = r.direction as TradeDirection
  const entry_price  = r.entry_price as number
  const exit_price   = r.exit_price as number
  const sl_price     = r.sl_price as number
  const contracts    = contractsRaw as number

  let pnl = r.pnl
  if (pnl === undefined || pnl === null) {
    pnl = calcPnl(direction, entry_price, exit_price, symbol, contracts)
  } else if (!isFiniteNumber(pnl)) {
    return { trade: null, errors: ["'pnl' debe ser number si se incluye"] }
  }

  let rr = r.rr
  if (rr === undefined || rr === null) {
    rr = calcRR(direction, entry_price, exit_price, sl_price)
  } else if (!isFiniteNumber(rr)) {
    return { trade: null, errors: ["'rr' debe ser number si se incluye"] }
  }

  const trade: TradeImportPayload = {
    date: r.date as string,
    time: r.time as string,
    symbol,
    direction,
    entry_price,
    exit_price,
    sl_price,
    contracts,
    trade_type: tradeTypeRaw as TradeType,
    result: r.result as TradeResult,
    pnl: pnl as number,
    rr: rr as number,
    confluences,
    target,
    kill_zone: killZone,
    comment: (r.comment as string | null | undefined) ?? null,
    notes: (r.notes as string | null | undefined) ?? null,
    image_url: (r.image_url as string | null | undefined) ?? null,
    image_url_2: (r.image_url_2 as string | null | undefined) ?? null,
    image_url_3: (r.image_url_3 as string | null | undefined) ?? null,
    image_url_4: (r.image_url_4 as string | null | undefined) ?? null,
    image_url_5: (r.image_url_5 as string | null | undefined) ?? null,
  }

  return { trade, errors: [] }
}

export interface ParsedImport {
  results: ImportValidationResult[]
  parseError: string | null
}

export function parseAndValidateImport(rawJson: string, defaultTradeType: TradeType = 'real'): ParsedImport {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { results: [], parseError: 'JSON inválido — revisa la sintaxis' }
  }

  if (!Array.isArray(parsed)) {
    return { results: [], parseError: 'El JSON debe ser un array de trades' }
  }
  if (parsed.length === 0) {
    return { results: [], parseError: 'El array está vacío' }
  }

  return { results: parsed.map(t => validateImportTrade(t, defaultTradeType)), parseError: null }
}
