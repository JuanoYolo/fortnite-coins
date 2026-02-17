import { API_BASE } from "../config";
import type {
  Candle,
  CoinMarketItem,
  MarketResponse,
  MarketType,
  ProfileResponse,
  SeriesResponse,
  SeriesTf,
  SeriesWindow
} from "../types";

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

export async function fetchSeries(
  market: MarketType,
  name: string,
  tf: SeriesTf,
  windowValue: SeriesWindow
): Promise<Candle[]> {
  const params = new URLSearchParams({
    market,
    name,
    tf,
    window: windowValue
  });
  const url = `${API_BASE}/api/series?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Series request failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!isSeriesResponse(data)) {
    throw new Error("Unexpected series response format");
  }

  return data.candles;
}

function isSeriesResponse(value: unknown): value is SeriesResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<SeriesResponse>;
  return Array.isArray(maybe.candles);
}

export async function fetchProfile(name: string, platform = "all"): Promise<ProfileResponse> {
  const params = new URLSearchParams({ name, platform });
  const url = `${API_BASE}/api/profile?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Profile request failed (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!isProfileResponse(data)) {
    throw new Error("Unexpected profile response format");
  }

  return data;
}

function isProfileResponse(value: unknown): value is ProfileResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<ProfileResponse>;
  return (
    typeof maybe.name === "string" &&
    typeof maybe.platform === "string" &&
    !!maybe.overview &&
    !!maybe.last7 &&
    !!maybe.last30 &&
    Array.isArray(maybe.modes)
  );
}
