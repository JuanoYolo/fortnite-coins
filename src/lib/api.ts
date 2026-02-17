import { API_BASE } from "../config";
import type { CoinMarketItem, MarketResponse, MarketType } from "../types";

export async function fetchMarket(market: MarketType): Promise<CoinMarketItem[]> {
  const url = `${API_BASE}/api/market?market=${market}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Market request failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!isMarketResponse(data)) {
    throw new Error("Unexpected market response format");
  }

  return data.items;
}

function isMarketResponse(value: unknown): value is MarketResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<MarketResponse>;
  return Array.isArray(maybe.items);
}
