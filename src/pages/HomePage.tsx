import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MiniLineChart from "../components/MiniLineChart";
import { useSearchParams } from "react-router-dom";
import MarketTable from "../components/MarketTable";
import { useInterval } from "../hooks/useInterval";
import { fetchMarket } from "../lib/api";
import { formatPct, formatPrice } from "../lib/format";
import type { CoinMarketItem, MarketType } from "../types";

const MINI_CHART_LIMIT = 20;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const market: MarketType = searchParams.get("market") === "season" ? "season" : "historic";
  const [items, setItems] = useState<CoinMarketItem[]>([]);
  const [historyByCoin, setHistoryByCoin] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    setLoading(true);
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    setHistoryByCoin({});
  }, [market]);

  const pollMarket = useCallback(() => {
    void loadMarket();
  }, [loadMarket]);

  useInterval(pollMarket, 30_000);

  const changeMarket = useCallback(
    (nextMarket: MarketType) => {
      setSearchParams({ market: nextMarket }, { replace: true });
    },
    [setSearchParams]
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
              </article>
            );
          })}
        </section>
      ) : null}
      {!loading && !error ? <MarketTable market={market} items={items} /> : null}
    </main>
  );
}
