import { Link } from "react-router-dom";
import { formatDate, formatPct, formatPrice } from "../lib/format";
import type { CoinMarketItem, MarketType } from "../types";

interface MarketTableProps {
  market: MarketType;
  items: CoinMarketItem[];
}

export default function MarketTable({ market, items }: MarketTableProps) {
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
