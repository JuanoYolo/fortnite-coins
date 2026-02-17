import { API_BASE } from "../config";
import type {
  Candle,
  CoinMarketItem,
  JoinRoomRequest,
  JoinRoomResponse,
  MarketHolding,
  MarketResponse,
  MarketType,
  ProfileResponse,
  SeriesResponse,
  SeriesTf,
  SeriesWindow,
  TradeRequest,
  TradeResponse,
  WalletResponse
} from "../types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseApiError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    if (typeof payload.error === "string") message = payload.error;
    if (typeof payload.message === "string") message = payload.message;
  } catch {
    // Keep default message when body is not JSON.
  }
  throw new ApiError(message, response.status);
}

export async function fetchMarket(market: MarketType): Promise<CoinMarketItem[]> {
  const url = `${API_BASE}/api/market?market=${market}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    await parseApiError(response);
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
    await parseApiError(response);
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
    await parseApiError(response);
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

export async function joinRoom(payload: JoinRoomRequest): Promise<JoinRoomResponse> {
  const response = await fetch(`${API_BASE}/api/room/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return (await response.json()) as JoinRoomResponse;
}

export async function fetchWallet(
  payload: JoinRoomRequest & { market: MarketType }
): Promise<WalletResponse> {
  const params = new URLSearchParams({
    room_code: payload.room_code,
    display_name: payload.display_name,
    player_code: payload.player_code,
    market: payload.market
  });
  const response = await fetch(`${API_BASE}/api/wallet?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  const data = (await response.json()) as WalletResponse;
  const holdings = Array.isArray(data.holdings) ? data.holdings : [];
  return {
    cash: Number(data.cash ?? 0),
    holdings: holdings.map((holding) => normalizeHolding(holding))
  };
}

function normalizeHolding(holding: Partial<MarketHolding>): MarketHolding {
  return {
    coin: String(holding.coin ?? ""),
    qty: Number(holding.qty ?? 0),
    avg_cost: Number(holding.avg_cost ?? 0)
  };
}

export async function submitTrade(payload: TradeRequest): Promise<TradeResponse> {
  const response = await fetch(`${API_BASE}/api/trade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return (await response.json()) as TradeResponse;
}
