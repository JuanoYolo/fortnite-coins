const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

const SPREAD_PCT = 0.005;

type MarketType = "historic" | "season";
type TradeSide = "buy" | "sell";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SYNC_TOKEN?: string;
  ADMIN_TOKEN?: string;
}

interface MarketItem {
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

interface RoomRecord {
  id: string;
  room_code: string;
}

interface PlayerRecord {
  id: string;
  room_id: string;
  display_name: string;
  player_code: string;
  cash: string;
}

interface HoldingRecord {
  id: string;
  room_id: string;
  player_id: string;
  market: MarketType;
  coin: string;
  qty: string;
  avg_cost: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (pathname === "/health" && request.method === "GET") {
        return json({ ok: true, service: "fortnite-coins-worker" });
      }

      if (pathname === "/api/market" && request.method === "GET") {
        const market = normalizeMarket(url.searchParams.get("market"));
        if (!market) return jsonError("Invalid market", 400);
        const items = await getMarketItems(env, market);
        return json({ market, items });
      }

      if (pathname === "/api/room/join" && request.method === "POST") {
        const body = await parseJson(request);
        const roomCode = asTrimmed(body.room_code);
        const displayName = asTrimmed(body.display_name);
        const playerCode = asTrimmed(body.player_code);

        if (!roomCode || !displayName || !playerCode) {
          return jsonError("room_code, display_name and player_code are required", 400);
        }

        const room = await getOrCreateRoom(env, roomCode);
        const player = await getPlayerByName(env, room.id, displayName);

        if (!player) {
          const created = await createPlayer(env, room.id, displayName, playerCode);
          return json({
            ok: true,
            room: { room_code: room.room_code },
            player: {
              id: created.id,
              display_name: created.display_name,
              cash: Number(created.cash)
            },
            spread_pct: SPREAD_PCT
          });
        }

        if (player.player_code !== playerCode) {
          return jsonError("Invalid player_code", 401);
        }

        return json({
          ok: true,
          room: { room_code: room.room_code },
          player: {
            id: player.id,
            display_name: player.display_name,
            cash: Number(player.cash)
          },
          spread_pct: SPREAD_PCT
        });
      }

      if (pathname === "/api/room/state" && request.method === "GET") {
        const roomCode = asTrimmed(url.searchParams.get("room_code"));
        const displayName = asTrimmed(url.searchParams.get("display_name"));
        const playerCode = asTrimmed(url.searchParams.get("player_code"));
        const market = normalizeMarket(url.searchParams.get("market"));
        if (!roomCode || !displayName || !playerCode || !market) {
          return jsonError("room_code, display_name, player_code and market are required", 400);
        }

        const player = await authenticatePlayer(env, roomCode, displayName, playerCode);
        if (!player) return jsonError("Invalid credentials", 401);

        const holdings = await getHoldings(env, player.room_id, player.id, market);
        return json({
          ok: true,
          room: { room_code: roomCode },
          player: {
            id: player.id,
            display_name: player.display_name,
            cash: Number(player.cash)
          },
          market,
          spread_pct: SPREAD_PCT,
          holdings: holdings.map((holding) => ({
            coin: holding.coin,
            qty: Number(holding.qty),
            avg_cost: Number(holding.avg_cost)
          }))
        });
      }

      if (pathname === "/api/wallet" && request.method === "GET") {
        const roomCode = asTrimmed(url.searchParams.get("room_code"));
        const displayName = asTrimmed(url.searchParams.get("display_name"));
        const playerCode = asTrimmed(url.searchParams.get("player_code"));
        const market = normalizeMarket(url.searchParams.get("market"));
        if (!roomCode || !displayName || !playerCode || !market) {
          return jsonError("room_code, display_name, player_code and market are required", 400);
        }

        const player = await authenticatePlayer(env, roomCode, displayName, playerCode);
        if (!player) return jsonError("Invalid credentials", 401);

        const holdings = await getHoldings(env, player.room_id, player.id, market);
        return json({
          cash: Number(player.cash),
          holdings: holdings.map((holding) => ({
            coin: holding.coin,
            qty: Number(holding.qty),
            avg_cost: Number(holding.avg_cost)
          }))
        });
      }

      if (
        (pathname === "/api/trade" || pathname === "/api/trade/buy" || pathname === "/api/trade/sell") &&
        request.method === "POST"
      ) {
        const body = await parseJson(request);
        const roomCode = asTrimmed(body.room_code);
        const displayName = asTrimmed(body.display_name);
        const playerCode = asTrimmed(body.player_code);
        const market = normalizeMarket(body.market);
        const coin = asTrimmed(body.coin);
        const sideFromPath = pathname === "/api/trade/buy" ? "buy" : pathname === "/api/trade/sell" ? "sell" : null;
        const side = sideFromPath ?? normalizeSide(body.side);
        const qty = Number(body.qty);

        if (!roomCode || !displayName || !playerCode || !market || !coin || !side || qty <= 0) {
          return jsonError("Invalid trade payload", 400);
        }

        const player = await authenticatePlayer(env, roomCode, displayName, playerCode);
        if (!player) return jsonError("Invalid credentials", 401);

        const items = await getMarketItems(env, market);
        const item = items.find((entry) => entry.coin === coin || entry.display_name === coin);
        if (!item) return jsonError("Coin not found in market", 400);

        const priceExec = side === "buy" ? item.price_now * (1 + SPREAD_PCT) : item.price_now * (1 - SPREAD_PCT);
        const notional = qty * priceExec;

        const currentCash = Number(player.cash);
        const currentHolding = await getHolding(env, player.id, market, item.coin, player.room_id);
        const currentQty = Number(currentHolding?.qty ?? 0);
        const currentAvgCost = Number(currentHolding?.avg_cost ?? 0);

        let nextCash = currentCash;
        let nextQty = currentQty;
        let nextAvgCost = currentAvgCost;

        if (side === "buy") {
          if (currentCash < notional) return jsonError("Insufficient cash", 400);
          nextCash = currentCash - notional;
          nextQty = currentQty + qty;
          nextAvgCost = nextQty > 0 ? (currentQty * currentAvgCost + qty * priceExec) / nextQty : 0;
        } else {
          if (currentQty < qty) return jsonError("Insufficient holdings", 400);
          nextCash = currentCash + notional;
          nextQty = currentQty - qty;
          nextAvgCost = nextQty === 0 ? 0 : currentAvgCost;
        }

        await updatePlayerCash(env, player.id, nextCash);
        await upsertHolding(env, {
          room_id: player.room_id,
          player_id: player.id,
          market,
          coin: item.coin,
          qty: nextQty,
          avg_cost: nextAvgCost
        });

        const trade = await insertTrade(env, {
          room_id: player.room_id,
          player_id: player.id,
          market,
          coin: item.coin,
          side,
          qty,
          price_exec: priceExec,
          notional,
          spread_pct: SPREAD_PCT
        });

        return json({
          ok: true,
          cash: nextCash,
          holding: {
            coin: item.coin,
            qty: nextQty,
            avg_cost: nextAvgCost
          },
          trade,
          price_exec: priceExec,
          spread_pct: SPREAD_PCT
        });
      }

      if (pathname === "/api/players" && request.method === "GET") {
        const roomCode = asTrimmed(url.searchParams.get("room_code"));
        if (!roomCode) return jsonError("room_code is required", 400);
        const room = await getRoomByCode(env, roomCode);
        if (!room) return json({ players: [] });
        const players = await supabaseSelect<PlayerRecord>(
          env,
          "room_players",
          "id,display_name,cash,created_at",
          `room_id=eq.${encodeURIComponent(room.id)}`
        );
        return json({
          room_code: roomCode,
          players: players.map((player) => ({
            id: player.id,
            display_name: player.display_name,
            cash: Number(player.cash)
          }))
        });
      }

      if (pathname === "/api/rooms/debug" && request.method === "GET") {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const expected = env.ADMIN_TOKEN || env.SYNC_TOKEN;
        if (!expected || token !== expected) return jsonError("Unauthorized", 401);

        const rooms = await supabaseSelect<{ id: string; room_code: string; name: string | null }>(
          env,
          "rooms",
          "id,room_code,name,created_at",
          "order=created_at.desc"
        );
        const players = await supabaseSelect<{ id: string; room_id: string; display_name: string; cash: string }>(
          env,
          "room_players",
          "id,room_id,display_name,cash,created_at",
          "order=created_at.desc"
        );
        return json({ rooms, players });
      }

      if (pathname === "/api/sync" && request.method === "POST") {
        const body = await parseJson(request);
        const token = asTrimmed(body.token);
        if (!env.SYNC_TOKEN || token !== env.SYNC_TOKEN) return jsonError("Unauthorized", 401);
        return json({ ok: true, message: "Sync endpoint is available" });
      }

      return jsonError("Not found", 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected worker error";
      return jsonError(message, 500);
    }
  }
};

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS }
  });
}

function jsonError(error: string, status = 400): Response {
  return json({ error }, status);
}

function normalizeMarket(value: unknown): MarketType | null {
  return value === "historic" || value === "season" ? value : null;
}

function normalizeSide(value: unknown): TradeSide | null {
  return value === "buy" || value === "sell" ? value : null;
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function parseJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return (await request.json()) as Record<string, unknown>;
}

async function getOrCreateRoom(env: Env, roomCode: string): Promise<RoomRecord> {
  const existing = await getRoomByCode(env, roomCode);
  if (existing) return existing;

  const created = await supabaseInsert<RoomRecord>(env, "rooms", {
    room_code: roomCode
  });
  return created;
}

async function getRoomByCode(env: Env, roomCode: string): Promise<RoomRecord | null> {
  const rows = await supabaseSelect<RoomRecord>(
    env,
    "rooms",
    "id,room_code",
    `room_code=eq.${encodeURIComponent(roomCode)}&limit=1`
  );
  return rows[0] ?? null;
}

async function getPlayerByName(env: Env, roomId: string, displayName: string): Promise<PlayerRecord | null> {
  const rows = await supabaseSelect<PlayerRecord>(
    env,
    "room_players",
    "id,room_id,display_name,player_code,cash",
    `room_id=eq.${encodeURIComponent(roomId)}&display_name=eq.${encodeURIComponent(displayName)}&limit=1`
  );
  return rows[0] ?? null;
}

async function createPlayer(
  env: Env,
  roomId: string,
  displayName: string,
  playerCode: string
): Promise<PlayerRecord> {
  return supabaseInsert<PlayerRecord>(env, "room_players", {
    room_id: roomId,
    display_name: displayName,
    player_code: playerCode,
    cash: 100000
  });
}

async function authenticatePlayer(
  env: Env,
  roomCode: string,
  displayName: string,
  playerCode: string
): Promise<PlayerRecord | null> {
  const room = await getRoomByCode(env, roomCode);
  if (!room) return null;
  const player = await getPlayerByName(env, room.id, displayName);
  if (!player) return null;
  if (player.player_code !== playerCode) return null;
  return player;
}

async function updatePlayerCash(env: Env, playerId: string, cash: number): Promise<void> {
  await supabasePatch(env, "room_players", `id=eq.${encodeURIComponent(playerId)}`, {
    cash
  });
}

async function getHolding(
  env: Env,
  playerId: string,
  market: MarketType,
  coin: string,
  roomId: string
): Promise<HoldingRecord | null> {
  const rows = await supabaseSelect<HoldingRecord>(
    env,
    "holdings",
    "id,room_id,player_id,market,coin,qty,avg_cost",
    `player_id=eq.${encodeURIComponent(playerId)}&room_id=eq.${encodeURIComponent(roomId)}&market=eq.${market}&coin=eq.${encodeURIComponent(coin)}&limit=1`
  );
  return rows[0] ?? null;
}

async function getHoldings(
  env: Env,
  roomId: string,
  playerId: string,
  market: MarketType
): Promise<HoldingRecord[]> {
  return supabaseSelect<HoldingRecord>(
    env,
    "holdings",
    "coin,qty,avg_cost,market,player_id,room_id,id",
    `room_id=eq.${encodeURIComponent(roomId)}&player_id=eq.${encodeURIComponent(playerId)}&market=eq.${market}&order=coin.asc`
  );
}

async function upsertHolding(
  env: Env,
  payload: {
    room_id: string;
    player_id: string;
    market: MarketType;
    coin: string;
    qty: number;
    avg_cost: number;
  }
): Promise<void> {
  await supabaseUpsert(env, "holdings", {
    ...payload,
    updated_at: new Date().toISOString()
  }, "player_id,market,coin");
}

async function insertTrade(
  env: Env,
  payload: {
    room_id: string;
    player_id: string;
    market: MarketType;
    coin: string;
    side: TradeSide;
    qty: number;
    price_exec: number;
    notional: number;
    spread_pct: number;
  }
): Promise<Record<string, unknown>> {
  const trade = await supabaseInsert<Record<string, unknown>>(env, "trades", payload);
  return {
    id: trade.id,
    coin: trade.coin,
    side: trade.side,
    qty: Number(trade.qty),
    price_exec: Number(trade.price_exec),
    notional: Number(trade.notional),
    spread_pct: Number(trade.spread_pct),
    created_at: trade.created_at
  };
}

async function getMarketItems(env: Env, market: MarketType): Promise<MarketItem[]> {
  const attempts = [
    {
      table: "coin_market_latest",
      select:
        "coin,display_name,market,price_now,power_score_now,change_24h_pct,high_24h,low_24h,last_updated"
    },
    {
      table: "market_prices_latest",
      select:
        "coin,display_name,market,price_now,power_score_now,change_24h_pct,high_24h,low_24h,last_updated"
    },
    {
      table: "prices_latest",
      select: "coin,display_name,market,price_now,power_score_now,change_24h_pct,high_24h,low_24h,last_updated"
    }
  ];

  for (const attempt of attempts) {
    try {
      const rows = await supabaseSelect<Record<string, unknown>>(
        env,
        attempt.table,
        attempt.select,
        `market=eq.${market}&order=price_now.desc`
      );

      if (rows.length > 0) {
        return rows.map((row) => normalizeMarketRow(row, market));
      }
    } catch {
      // Try next candidate table.
    }
  }

  throw new Error("Unable to read market data from Supabase");
}

function normalizeMarketRow(row: Record<string, unknown>, fallbackMarket: MarketType): MarketItem {
  return {
    coin: String(row.coin ?? ""),
    display_name: String(row.display_name ?? row.coin ?? ""),
    market: normalizeMarket(row.market) ?? fallbackMarket,
    price_now: Number(row.price_now ?? 0),
    power_score_now: Number(row.power_score_now ?? 0),
    change_24h_pct: Number(row.change_24h_pct ?? 0),
    high_24h: Number(row.high_24h ?? 0),
    low_24h: Number(row.low_24h ?? 0),
    last_updated: String(row.last_updated ?? new Date().toISOString())
  };
}

function supabaseHeaders(env: Env): HeadersInit {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json"
  };
}

async function supabaseSelect<T>(env: Env, table: string, select: string, query = ""): Promise<T[]> {
  const path = `/rest/v1/${table}?select=${encodeURIComponent(select)}${query ? `&${query}` : ""}`;
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    method: "GET",
    headers: supabaseHeaders(env)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T[];
}

async function supabaseInsert<T>(env: Env, table: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(env),
      prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const rows = (await response.json()) as T[];
  return rows[0];
}

async function supabaseUpsert(
  env: Env,
  table: string,
  payload: Record<string, unknown>,
  onConflict: string
): Promise<void> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(env),
      prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function supabasePatch(
  env: Env,
  table: string,
  query: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(env),
      prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}
