import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp
} from "lightweight-charts";
import type { Candle } from "../types";

interface CandlestickChartProps {
  candles: Candle[];
}

export default function CandlestickChart({ candles }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const previousRef = useRef<Candle[]>([]);

  const toChartCandle = (candle: Candle): CandlestickData<UTCTimestamp> => ({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  });

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1625" },
        textColor: "#8ba3c6"
      },
      grid: {
        vertLines: { color: "#1f3554" },
        horzLines: { color: "#1f3554" }
      },
      rightPriceScale: {
        borderColor: "#1f3554"
      },
      timeScale: {
        borderColor: "#1f3554",
        timeVisible: true
      },
      crosshair: {
        vertLine: { color: "#3a6fb7" },
        horzLine: { color: "#3a6fb7" }
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#43d28f",
      downColor: "#ff6b7f",
      borderUpColor: "#43d28f",
      borderDownColor: "#ff6b7f",
      wickUpColor: "#43d28f",
      wickDownColor: "#ff6b7f"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({
        width: entry.contentRect.width,
        height: 340
      });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      previousRef.current = [];
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const prev = previousRef.current;
    const next = candles;

    if (next.length === 0) {
      series.setData([]);
      previousRef.current = [];
      return;
    }

    if (prev.length === 0) {
      series.setData(next.map(toChartCandle));
      chart.timeScale().fitContent();
      previousRef.current = next;
      return;
    }

    if (next.length === prev.length) {
      series.update(toChartCandle(next[next.length - 1]));
      previousRef.current = next;
      return;
    }

    if (next.length === prev.length + 1) {
      series.update(toChartCandle(next[next.length - 2]));
      series.update(toChartCandle(next[next.length - 1]));
      previousRef.current = next;
      return;
    }

    series.setData(next.map(toChartCandle));
    chart.timeScale().fitContent();
    previousRef.current = next;
  }, [candles]);

  return <div ref={containerRef} className="candles-container" />;
}
