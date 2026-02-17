interface MiniLineChartProps {
  points: number[];
}

function buildPath(points: number[], width: number, height: number): string {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function MiniLineChart({ points }: MiniLineChartProps) {
  const width = 280;
  const height = 90;
  const path = buildPath(points, width, height);

  return (
    <svg
      className="mini-line-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Mini price chart"
    >
      <rect x="0" y="0" width={width} height={height} rx="8" />
      {path ? <path d={path} /> : null}
    </svg>
  );
}
