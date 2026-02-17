export type MarketType = "historic" | "season";
export type SeriesTf = "1m" | "5m" | "15m";
export type SeriesWindow = "6h" | "24h" | "7d";

export interface CoinMarketItem {
  coin: string;
  display_name: string;
  market: MarketType;
  price_now: number;
  power_score_now: number;
  change_24h_pct: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

export interface MarketResponse {
  market: MarketType;
  items: CoinMarketItem[];
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SeriesResponse {
  market: MarketType;
  name: string;
  tf: SeriesTf;
  candles: Candle[];
}

export interface ProfileOverview {
  winRate: number;
  wins: number;
  kd: number;
  kills: number;
  matches: number;
  playtime: number;
  battlePassLevel?: number;
}

export interface ProfilePeriod {
  wins: number;
  kd: number;
  kills: number;
  matches: number;
}

export interface ProfileModeStats {
  mode: "solo" | "duo" | "trio" | "squad";
  wins: number;
  kd: number;
  kills: number;
  matches: number;
  winRate: number;
}

export interface ProfileResponse {
  name: string;
  platform: string;
  overview: ProfileOverview;
  last7: ProfilePeriod;
  last30: ProfilePeriod;
  modes: ProfileModeStats[];
}

export interface JoinRoomRequest {
  room_code: string;
  display_name: string;
  player_code: string;
}

export interface JoinRoomResponse {
  room: {
    room_code: string;
  };
  player: {
    id: string;
    display_name: string;
    cash: number;
  };
  spread_pct: number;
}

export interface MarketHolding {
  coin: string;
  qty: number;
  avg_cost: number;
}

export interface WalletResponse {
  cash: number;
  holdings: MarketHolding[];
}

export type TradeSide = "buy" | "sell";

export interface TradeRequest extends JoinRoomRequest {
  market: MarketType;
  coin: string;
  side: TradeSide;
  qty: number;
}

export interface TradeResponse {
  ok: true;
  cash: number;
  holding: MarketHolding;
  trade: {
    id: string;
    coin: string;
    side: TradeSide;
    qty: number;
    price_exec: number;
    notional: number;
    spread_pct: number;
    created_at?: string;
  };
  price_exec: number;
  spread_pct: number;
}
