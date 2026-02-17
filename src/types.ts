export type MarketType = "historic" | "season";

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
