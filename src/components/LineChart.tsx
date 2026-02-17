interface LineChartProps {
  points: number[];
}

function buildPath(points: number[], width: number, height: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M0 ${height / 2} L${width} ${height / 2}`;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function LineChart({ points }: LineChartProps) {
  const width = 900;
  const height = 260;
  const path = buildPath(points, width, height);

  return (
    <div className="chart-panel">
      <h3>Live Price (local sampled every 10s)</h3>
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Price trend line chart"
      >
        <rect x="0" y="0" width={width} height={height} rx="10" />
        {path ? <path d={path} /> : null}
      </svg>
    </div>
  );
}
