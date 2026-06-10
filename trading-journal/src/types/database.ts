export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DolType =
  | 'SSL'
  | 'BSL'
  | 'Equal Highs'
  | 'Equal Lows'
  | 'NY Opening Gap'
  | 'Relative Equal Highs'
  | 'Relative Equal Lows'
  | 'Data Highs'
  | 'Data Lows'
  | 'POC Diario'
  | 'POC Semanal'
  | 'VAH'
  | 'VAL'
  | 'HVN'
  | 'LVN'

export type KillZone = 'London' | 'NY Open' | 'NY AM' | 'NY PM'

export type TradeDirection = 'long' | 'short'

export type TradeResult = 'win' | 'loss' | 'BE'

export type Symbol = 'MNQ' | 'NQ' | 'ES' | 'MES'

export type IctConfluence =
  | 'FVG'
  | 'OB'
  | 'MSS'
  | 'SSL sweep'
  | 'BSL sweep'
  | 'Judas Swing'
  | 'AMD'
  | 'CISD'
  | 'Protected Swing'
  | 'VWAP'
  | 'otros'
  | 'Absorción'
  | 'Order Flow Delta'
  | 'Imbalance (Bid/Ask)'
  | 'Stacked Imbalances'
  | 'Delta Divergence'
  | 'Iceberg Order'
  | 'Exhaustion'
  | 'Volume Climax'
  | 'POC Migration'

export type AccountStatus = 'activa' | 'funded' | 'breached' | 'completada'

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
  result: TradeResult
  pnl: number
  rr: number
  confluences: IctConfluence[]
  dol_type: DolType | null
  kill_zone: KillZone | null
  comment: string | null
  notes: string | null
  image_url: string | null
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
    }
  }
}
