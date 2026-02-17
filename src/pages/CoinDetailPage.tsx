import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CandlestickChart from "../components/CandlestickChart";
import FortniteProfilePanel from "../components/FortniteProfilePanel";
import { useInterval } from "../hooks/useInterval";
import { fetchMarket, fetchProfile, fetchSeries } from "../lib/api";
import { formatDate, formatPct, formatPrice } from "../lib/format";
import type {
  Candle,
  CoinMarketItem,
  MarketType,
  ProfileResponse,
  SeriesTf,
  SeriesWindow
} from "../types";

function parseMarket(search: string): MarketType {
  const value = new URLSearchParams(search).get("market");
  return value === "season" ? "season" : "historic";
}

const TF_OPTIONS: SeriesTf[] = ["1m", "5m", "15m"];
const WINDOW_OPTIONS: SeriesWindow[] = ["6h", "24h", "7d"];

export default function CoinDetailPage() {
  const { display_name } = useParams<{ display_name: string }>();
  const location = useLocation();
  const market = useMemo(() => parseMarket(location.search), [location.search]);
  const decodedName = decodeURIComponent(display_name ?? "");

  const [coin, setCoin] = useState<CoinMarketItem | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [tf, setTf] = useState<SeriesTf>("1m");
  const [windowValue, setWindowValue] = useState<SeriesWindow>("24h");
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoin = useCallback(async () => {
    const items = await fetchMarket(market);
    const next = items.find((item) => item.display_name === decodedName);
    if (!next) {
      throw new Error("Coin not found in selected market");
    }
    setCoin(next);
  }, [decodedName, market]);

  const loadSeries = useCallback(async () => {
    const next = await fetchSeries(market, decodedName, tf, windowValue);
    setCandles(next);
    setCoin((prev) => {
      if (!prev || next.length === 0) return prev;
      const latestClose = next[next.length - 1].close;
      return { ...prev, price_now: latestClose };
    });
  }, [decodedName, market, tf, windowValue]);

  const loadProfile = useCallback(async () => {
    const next = await fetchProfile(decodedName, "all");
    setProfile(next);
  }, [decodedName]);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadCoin(), loadSeries(), loadProfile()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setSeriesLoading(false);
    }
  }, [loadCoin, loadProfile, loadSeries]);

  useEffect(() => {
    setLoading(true);
    setSeriesLoading(true);
    setCandles([]);
    setProfile(null);
    void loadAll();
  }, [loadAll]);

  const pollSeries = useCallback(async () => {
    try {
      await loadSeries();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [loadSeries]);

  useInterval(() => {
    void pollSeries();
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

          <section className="chart-panel">
            <div className="chart-controls">
              <div className="selector-row">
                <label htmlFor="tf-select">TF</label>
                <select
                  id="tf-select"
                  value={tf}
                  onChange={(event) => setTf(event.target.value as SeriesTf)}
                >
                  {TF_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="selector-row">
                <label htmlFor="window-select">Window</label>
                <select
                  id="window-select"
                  value={windowValue}
                  onChange={(event) => setWindowValue(event.target.value as SeriesWindow)}
                >
                  {WINDOW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {seriesLoading ? <p className="status">Loading candles...</p> : null}
            <CandlestickChart candles={candles} />
          </section>

          {profile ? <FortniteProfilePanel profile={profile} /> : null}
        </>
      ) : null}
    </main>
  );
}
