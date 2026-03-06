import { useMemo, useState } from "react";

type Breakdown = { company: string; count: number };
type MonthlyPoint = { month: string; value: number; breakdown: Breakdown[] };

export default function AreaChart({
  data,
  height = 320,
  stepPx = 60,
}: {
  data: MonthlyPoint[];
  height?: number;
  stepPx?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const { points, width, path } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value));
    const w = Math.max(12, data.length) * stepPx;
    const h = height;
    const pts = data.map((d, i) => {
      const x = i * stepPx;
      const y = h - (d.value / max) * h;
      return { x, y };
    });
    if (pts.length === 0) {
      return { points: [], width: w, path: "" };
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      const cy = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x} ${p0.y} ${cx} ${cy}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    return { points: pts, width: w, path: d };
  }, [data, height, stepPx]);

  return (
    <div className="relative w-full overflow-x-auto">
      <div
        className="relative min-w-[720px] bg-white rounded-2xl border border-gray-100 p-8"
        style={{ height: height + 100 }}
      >
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="areagrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={height * 0.25}
            x2={width}
            y2={height * 0.25}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={height * 0.5}
            x2={width}
            y2={height * 0.5}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={height * 0.75}
            x2={width}
            y2={height * 0.75}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          <path d={path} fill="url(#areagrad)" stroke="none" />
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill="#1d4ed8"
                className="cursor-pointer"
                onClick={() => setSelected(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() =>
                  setHovered((prev) => (prev === i ? null : prev))
                }
              />
            </g>
          ))}
        </svg>
        <div className="grid grid-cols-12 gap-2 mt-3">
          {data.map((d, i) => (
            <div
              key={i}
              className="text-[10px] text-gray-400 font-bold text-center"
            >
              {d.month}
            </div>
          ))}
        </div>
        {(hovered != null || selected != null) &&
          data[(hovered ?? selected)!] && (
            <div
              className="absolute bg-black text-white rounded-xl p-3 w-64 shadow-2xl"
              style={{
                left: Math.min(
                  Math.max((points[(hovered ?? selected)!]?.x ?? 0) + 16, 8),
                  width - 280,
                ),
                top: Math.max((points[(hovered ?? selected)!]?.y ?? 0) - 8, 8),
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">
                  {data[(hovered ?? selected)!].month}
                </span>
                <button
                  className="text-xs text-gray-300"
                  onClick={() => {
                    setSelected(null);
                    setHovered(null);
                  }}
                >
                  ×
                </button>
              </div>
              <p className="text-sm font-black">
                {data[(hovered ?? selected)!].value} PO
              </p>
              <div className="mt-2 space-y-1">
                {data[(hovered ?? selected)!].breakdown
                  .slice(0, 4)
                  .map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-200">{b.company}</span>
                      <span className="text-xs font-bold">{b.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
