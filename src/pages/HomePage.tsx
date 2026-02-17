import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MarketTable from "../components/MarketTable";
import { useInterval } from "../hooks/useInterval";
import { fetchMarket } from "../lib/api";
import type { CoinMarketItem, MarketType } from "../types";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const market: MarketType = searchParams.get("market") === "season" ? "season" : "historic";
  const [items, setItems] = useState<CoinMarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    try {
      const responseItems = await fetchMarket(market);
      setItems(responseItems);
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
      {!loading && !error ? <MarketTable market={market} items={items} /> : null}
    </main>
  );
}
