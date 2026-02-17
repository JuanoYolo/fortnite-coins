import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import JoinRoom from "../components/JoinRoom";
import MarketTable from "../components/MarketTable";
import MiniLineChart from "../components/MiniLineChart";
import TradeModal from "../components/TradeModal";
import WalletCard from "../components/WalletCard";
import { useRoomSession } from "../context/RoomSessionContext";
import { useInterval } from "../hooks/useInterval";
import { ApiError, fetchMarket, fetchWallet, joinRoom, submitTrade } from "../lib/api";
import { formatPct, formatPrice } from "../lib/format";
import type { CoinMarketItem, MarketHolding, MarketType, TradeSide, WalletResponse } from "../types";

const MINI_CHART_LIMIT = 20;
const DEFAULT_SPREAD = 0.005;

interface ActiveTrade {
  coin: CoinMarketItem;
  side: TradeSide;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const market: MarketType = searchParams.get("market") === "season" ? "season" : "historic";
  const { session, setSession, clearSession } = useRoomSession();

  const [items, setItems] = useState<CoinMarketItem[]>([]);
  const [historyByCoin, setHistoryByCoin] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [spreadPct, setSpreadPct] = useState(DEFAULT_SPREAD);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    try {
      const responseItems = await fetchMarket(market);
      setItems(responseItems);
      setHistoryByCoin((previous) => {
        const next: Record<string, number[]> = {};
        responseItems.slice(0, 3).forEach((item) => {
          const current = previous[item.display_name] ?? [];
          next[item.display_name] = [...current.slice(-(MINI_CHART_LIMIT - 1)), item.price_now];
        });
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [market]);

  const loadWallet = useCallback(async () => {
    if (!session) {
      setWallet(null);
      return;
    }

    setWalletLoading(true);
    try {
      const nextWallet = await fetchWallet({ ...session, market });
      setWallet(nextWallet);
      setWalletError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet request failed";
      setWalletError(message);
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
      }
    } finally {
      setWalletLoading(false);
    }
  }, [clearSession, market, session]);

  useEffect(() => {
    setLoading(true);
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    setHistoryByCoin({});
  }, [market]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const pollMarket = useCallback(() => {
    void loadMarket();
  }, [loadMarket]);

  useInterval(pollMarket, 30_000);

  const pollWallet = useCallback(() => {
    void loadWallet();
  }, [loadWallet]);

  useInterval(pollWallet, session ? 30_000 : null);

  const changeMarket = useCallback(
    (nextMarket: MarketType) => {
      setSearchParams({ market: nextMarket }, { replace: true });
    },
    [setSearchParams]
  );

  const marketHoldings: MarketHolding[] = useMemo(() => {
    const holdings = wallet?.holdings ?? [];
    return holdings.filter((holding) => Number(holding.qty) > 0);
  }, [wallet]);

  const handleJoin = useCallback(
    async (values: { room_code: string; display_name: string; player_code: string }) => {
      setJoinLoading(true);
      try {
        const response = await joinRoom(values);
        setSession(values);
        setSpreadPct(response.spread_pct ?? DEFAULT_SPREAD);
        setJoinError(null);
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : "Unable to join room");
      } finally {
        setJoinLoading(false);
      }
    },
    [setSession]
  );

  const openTradeModal = useCallback((coin: CoinMarketItem, side: TradeSide) => {
    setActiveTrade({ coin, side });
    setTradeError(null);
  }, []);

  const closeTradeModal = useCallback(() => {
    if (tradeLoading) return;
    setActiveTrade(null);
    setTradeError(null);
  }, [tradeLoading]);

  const executeTrade = useCallback(
    async (qty: number) => {
      if (!session || !activeTrade) return;
      setTradeLoading(true);
      try {
        const response = await submitTrade({
          ...session,
          market,
          coin: activeTrade.coin.coin,
          side: activeTrade.side,
          qty
        });
        setSpreadPct(response.spread_pct ?? DEFAULT_SPREAD);
        setWallet((previous) => ({
          cash: response.cash,
          holdings: (() => {
            const current = previous?.holdings ?? [];
            const next = current.filter((holding) => holding.coin !== response.holding.coin);
            next.push(response.holding);
            return next;
          })()
        }));
        setTradeError(null);
        setActiveTrade(null);
        await Promise.all([loadWallet(), loadMarket()]);
      } catch (err) {
        setTradeError(err instanceof Error ? err.message : "Trade failed");
      } finally {
        setTradeLoading(false);
      }
    },
    [activeTrade, loadMarket, loadWallet, market, session]
  );

  return (
    <main className="page">
      <header className="page-head">
        <h1>Fortnite Coins Market</h1>
        <div className="toggle">
          <button
            type="button"
            className={market === "historic" ? "active" : ""}
            onClick={() => changeMarket("historic")}
          >
            Historic
          </button>
          <button
            type="button"
            className={market === "season" ? "active" : ""}
            onClick={() => changeMarket("season")}
          >
            Season
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="status">Loading market...</p> : null}

      {!loading && !error ? (
        <section className="mini-grid">
          {items.slice(0, 3).map((item) => {
            const up = item.change_24h_pct >= 0;
            return (
              <article className="mini-card" key={item.display_name}>
                <div className="mini-card-head">
                  <Link to={`/coin/${encodeURIComponent(item.display_name)}?market=${market}`}>
                    {item.coin}
                  </Link>
                  <span className={up ? "trend-up" : "trend-down"}>
                    {up ? "^" : "v"} {formatPct(item.change_24h_pct)}
                  </span>
                </div>
                <p className="mini-price">{formatPrice(item.price_now)}</p>
                <MiniLineChart points={historyByCoin[item.display_name] ?? [item.price_now]} />
                {session ? (
                  <div className="card-actions">
                    <button type="button" className="action-btn buy" onClick={() => openTradeModal(item, "buy")}>
                      BUY
                    </button>
                    <button
                      type="button"
                      className="action-btn sell"
                      onClick={() => openTradeModal(item, "sell")}
                    >
                      SELL
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {session ? (
        <WalletCard
          wallet={wallet}
          marketHoldings={marketHoldings}
          market={market}
          loading={walletLoading}
          error={walletError}
          onLeaveRoom={clearSession}
        />
      ) : null}

      {!loading && !error ? (
        <MarketTable market={market} items={items} onTrade={openTradeModal} canTrade={!!session} />
      ) : null}

      <JoinRoom
        open={!session}
        loading={joinLoading}
        error={joinError}
        initialValues={session ?? undefined}
        onSubmit={handleJoin}
      />

      {activeTrade ? (
        <TradeModal
          open
          side={activeTrade.side}
          coin={activeTrade.coin.coin}
          market={market}
          priceNow={activeTrade.coin.price_now}
          spreadPct={spreadPct}
          loading={tradeLoading}
          error={tradeError}
          onClose={closeTradeModal}
          onConfirm={executeTrade}
        />
      ) : null}
    </main>
  );
}
