export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export const TARGET_TYPES = [
  // Big Trades
  'Big Trade Comprador',
  'Big Trade Vendedor',
  'Big Trade',
  // VAL
  'VAL diario',
  'VAL RTH',
  'VAL día anterior',
  'VAL horario',
  'VAL semanal',
  'VAL mensual',
  // VAH
  'VAH diario',
  'VAH RTH',
  'VAH día anterior',
  'VAH horario',
  'VAH semanal',
  'VAH mensual',
  // POC
  'POC horario',
  'POC diario',
  'POC semanal',
  'POC mensual',
  // VWAP
  'VWAP ETH',
  'VWAP RTH',
  'VWAP día anterior',
  'VWAP semanal',
  'VWAP mensual',
  // Initial Balance
  'IB High 30min',
  'IB High 1h',
  'IB Low 30min',
  'IB Low 1h',
  // Nodos
  'HVN',
  'LVN',
  // TPO
  'TPO',
  // Gaps
  'NDOG',
  'NWOG',
  'NMOG',
] as const
export type TargetType = typeof TARGET_TYPES[number]

export const KILL_ZONES = ['London', 'NY', 'Asia', 'Oceania'] as const
export type KillZone = typeof KILL_ZONES[number]

export const TRADE_DIRECTIONS = ['long', 'short'] as const
export type TradeDirection = typeof TRADE_DIRECTIONS[number]

export const TRADE_RESULTS = ['win', 'loss', 'BE'] as const
export type TradeResult = typeof TRADE_RESULTS[number]

export const SYMBOLS = ['MNQ', 'NQ', 'ES', 'MES'] as const
export type Symbol = typeof SYMBOLS[number]

export const ORDER_FLOW_CONFLUENCES = [
  'Absorción',
  'Order Flow Delta',
  'Imbalance (Bid/Ask)',
  'Stacked Imbalances',
  'Delta Divergence',
  'Iceberg Order',
  'Exhaustion',
  'Volume Climax',
  'POC Migration',
] as const
export type OrderFlowConfluence = typeof ORDER_FLOW_CONFLUENCES[number]

export const TRADE_TYPES = ['real', 'backtest', 'demo_destacado'] as const
export type TradeType = typeof TRADE_TYPES[number]

export const ACCOUNT_STATUSES = ['activa', 'funded', 'breached', 'completada'] as const
export type AccountStatus = typeof ACCOUNT_STATUSES[number]

export const PROP_FIRMS = [
  'Lucid Trading',
  'FTMO',
  'MyForexFunds',
  'TopStep',
  'Apex',
  'Otro',
] as const
export type PropFirm = typeof PROP_FIRMS[number]

export interface Payout {
  id:         string
  created_at: string
  account_id: string
  amount:     number
  date:       string
  notes:      string | null
}

export interface FundingAccount {
  id:            string
  created_at:    string
  name:          string
  prop_firm:     string
  cost:          number
  purchase_date: string
  status:        AccountStatus
  notes:         string | null
}

export interface AccountWithPayouts extends FundingAccount {
  payouts:       Payout[]
  total_payouts: number
  net_pnl:       number
}

export interface CustomConfluence {
  id:         string
  label:      string
  created_at: string
}

export interface Trade {
  id: string
  created_at: string
  date: string
  time: string
  symbol: Symbol
  direction: TradeDirection
  entry_price: number
  exit_price: number
  sl_price: number
  contracts: number
  trade_type: TradeType
  result: TradeResult
  pnl: number
  rr: number
  confluences: string[]
  target: TargetType | null
  kill_zone: KillZone | null
  comment: string | null
  notes: string | null
  image_url: string | null
  image_url_2: string | null
  image_url_3: string | null
  image_url_4: string | null
  image_url_5: string | null
}

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at'>
        Update: Partial<Omit<Trade, 'id' | 'created_at'>>
      }
      funding_accounts: {
        Row: FundingAccount
        Insert: Omit<FundingAccount, 'id' | 'created_at'>
        Update: Partial<Omit<FundingAccount, 'id' | 'created_at'>>
      }
      payouts: {
        Row: Payout
        Insert: Omit<Payout, 'id' | 'created_at'>
        Update: Partial<Omit<Payout, 'id' | 'created_at'>>
      }
      custom_confluences: {
        Row: CustomConfluence
        Insert: Omit<CustomConfluence, 'id' | 'created_at'>
        Update: Partial<Omit<CustomConfluence, 'id' | 'created_at'>>
      }
    }
  }
}
