import { Link } from "react-router-dom";
import { formatDate, formatPct, formatPrice } from "../lib/format";
import type { CoinMarketItem, MarketType, TradeSide } from "../types";

interface MarketTableProps {
  market: MarketType;
  items: CoinMarketItem[];
  onTrade: (coin: CoinMarketItem, side: TradeSide) => void;
  canTrade: boolean;
}

export default function MarketTable({ market, items, onTrade, canTrade }: MarketTableProps) {
  return (
    <div className="table-wrap">
      <table className="market-table">
        <thead>
          <tr>
            <th>Coin</th>
            <th>Price now</th>
            <th>24h</th>
            <th>24h high</th>
            <th>24h low</th>
            <th>Last updated</th>
            <th>Trade</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const up = item.change_24h_pct >= 0;
            return (
              <tr key={item.display_name}>
                <td>
                  <Link
                    className="coin-link"
                    to={`/coin/${encodeURIComponent(item.display_name)}?market=${market}`}
                  >
                    {item.coin}
                  </Link>
                </td>
                <td>{formatPrice(item.price_now)}</td>
                <td className={up ? "trend-up" : "trend-down"}>
                  <span>{up ? "^" : "v"}</span> {formatPct(item.change_24h_pct)}
                </td>
                <td>{formatPrice(item.high_24h)}</td>
                <td>{formatPrice(item.low_24h)}</td>
                <td>{formatDate(item.last_updated)}</td>
                <td>
                  {canTrade ? (
                    <div className="table-actions">
                      <button type="button" className="action-btn buy" onClick={() => onTrade(item, "buy")}>
                        BUY
                      </button>
                      <button type="button" className="action-btn sell" onClick={() => onTrade(item, "sell")}>
                        SELL
                      </button>
                    </div>
                  ) : (
                    <span className="muted">Join room</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
