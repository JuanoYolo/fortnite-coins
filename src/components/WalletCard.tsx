import { formatPrice } from "../lib/format";
import type { MarketHolding, WalletResponse } from "../types";

interface WalletCardProps {
  wallet: WalletResponse | null;
  marketHoldings: MarketHolding[];
  market: "historic" | "season";
  loading: boolean;
  error: string | null;
  onLeaveRoom: () => void;
}

export default function WalletCard({
  wallet,
  marketHoldings,
  market,
  loading,
  error,
  onLeaveRoom
}: WalletCardProps) {
  return (
    <section className="wallet-card">
      <div className="wallet-head">
        <h2>My Wallet</h2>
        <button type="button" className="action-btn ghost" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>
      {loading ? <p className="status">Loading wallet...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error ? (
        <>
          <p className="wallet-cash">
            Cash: <strong>{formatPrice(wallet?.cash ?? 0)}</strong>
          </p>
          <p className="muted market-label">Market: {market}</p>
          {marketHoldings.length > 0 ? (
            <div className="wallet-holdings">
              {marketHoldings.map((holding) => (
                <article key={holding.coin} className="holding-item">
                  <span>{holding.coin}</span>
                  <span>Qty: {Number(holding.qty).toFixed(4)}</span>
                  <span>Avg: {formatPrice(Number(holding.avg_cost))}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No holdings yet for this market.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
