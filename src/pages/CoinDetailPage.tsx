import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import LineChart from "../components/LineChart";
import { useInterval } from "../hooks/useInterval";
import { fetchMarket } from "../lib/api";
import { formatDate, formatPct, formatPrice } from "../lib/format";
import type { CoinMarketItem, MarketType } from "../types";

function parseMarket(search: string): MarketType {
  const value = new URLSearchParams(search).get("market");
  return value === "season" ? "season" : "historic";
}

export default function CoinDetailPage() {
  const { display_name } = useParams<{ display_name: string }>();
  const location = useLocation();
  const market = useMemo(() => parseMarket(location.search), [location.search]);
  const decodedName = decodeURIComponent(display_name ?? "");

  const [coin, setCoin] = useState<CoinMarketItem | null>(null);
  const [points, setPoints] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoin = useCallback(async () => {
    try {
      const items = await fetchMarket(market);
      const next = items.find((item) => item.display_name === decodedName);
      if (!next) {
        throw new Error("Coin not found in selected market");
      }
      setCoin(next);
      setPoints((prev) => [...prev.slice(-59), next.price_now]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [decodedName, market]);

  useEffect(() => {
    setLoading(true);
    setPoints([]);
    void loadCoin();
  }, [loadCoin]);

  useInterval(() => {
    void loadCoin();
  }, 10_000);

  return (
    <main className="page">
      <header className="page-head">
        <h1>Coin Detail</h1>
        <Link className="back-btn" to={`/?market=${market}`}>
          Back
        </Link>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="status">Loading coin...</p> : null}

      {!loading && !error && coin ? (
        <>
          <section className="coin-card">
            <h2>{coin.coin}</h2>
            <p>
              <strong>Display Name:</strong> {coin.display_name}
            </p>
            <p>
              <strong>Price now:</strong> {formatPrice(coin.price_now)}
            </p>
            <p className={coin.change_24h_pct >= 0 ? "trend-up" : "trend-down"}>
              <strong>24h change:</strong> {formatPct(coin.change_24h_pct)}
            </p>
            <p>
              <strong>24h high:</strong> {formatPrice(coin.high_24h)}
            </p>
            <p>
              <strong>24h low:</strong> {formatPrice(coin.low_24h)}
            </p>
            <p>
              <strong>Last updated:</strong> {formatDate(coin.last_updated)}
            </p>
          </section>
          <LineChart points={points} />
        </>
      ) : null}
    </main>
  );
}
