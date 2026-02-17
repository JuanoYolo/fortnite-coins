import { useMemo, useState } from "react";
import { formatPrice } from "../lib/format";
import type { MarketType, TradeSide } from "../types";

interface TradeModalProps {
  open: boolean;
  side: TradeSide;
  coin: string;
  market: MarketType;
  priceNow: number;
  spreadPct: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}

export default function TradeModal({
  open,
  side,
  coin,
  market,
  priceNow,
  spreadPct,
  loading,
  error,
  onClose,
  onConfirm
}: TradeModalProps) {
  const [mode, setMode] = useState<"coins" | "cash">("coins");
  const [amount, setAmount] = useState<string>("");

  const execPrice = useMemo(
    () => (side === "buy" ? priceNow * (1 + spreadPct) : priceNow * (1 - spreadPct)),
    [priceNow, side, spreadPct]
  );

  const qty = useMemo(() => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    if (mode === "coins") return parsed;
    return parsed / execPrice;
  }, [amount, execPrice, mode]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel"
        aria-modal="true"
        role="dialog"
        aria-label="Trade modal"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{side === "buy" ? "Buy" : "Sell"} {coin}</h2>
        <p className="muted">{market} market</p>

        <div className="trade-prices">
          <p>Price now: {formatPrice(priceNow)}</p>
          <p>Exec price ({(spreadPct * 100).toFixed(2)}% spread): {formatPrice(execPrice)}</p>
        </div>

        <div className="toggle trade-toggle">
          <button type="button" className={mode === "coins" ? "active" : ""} onClick={() => setMode("coins")}>
            Qty coins
          </button>
          <button type="button" className={mode === "cash" ? "active" : ""} onClick={() => setMode("cash")}>
            Cash amount
          </button>
        </div>

        <label className="field-label" htmlFor="trade-amount">
          {mode === "coins" ? "Coins" : "Cash"}
        </label>
        <input
          id="trade-amount"
          className="text-input"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <p className="muted">Qty to execute: {qty > 0 ? qty.toFixed(6) : "-"}</p>

        {error ? <p className="error inline-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="action-btn ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`action-btn ${side === "buy" ? "buy" : "sell"}`}
            onClick={() => onConfirm(qty)}
            disabled={loading || qty <= 0}
          >
            {loading ? "Sending..." : side.toUpperCase()}
          </button>
        </div>
      </section>
    </div>
  );
}
