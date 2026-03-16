import React from "react";
import { Tooltip, ResponsiveContainer } from "recharts";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

export function ChartContainer({
  config,
  className = "",
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const styleVars: React.CSSProperties = {
    // set CSS variables for colors
    ["--color-desktop" as any]: config.desktop?.color || "#3b82f6",
    ["--color-mobile" as any]: config.mobile?.color || "#60a5fa",
    minWidth: 0,
    minHeight: 0,
  };
  return (
    <div className={className} style={styleVars}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltipContent(props: {
  labelFormatter?: (v: any) => string;
  valueFormatter?: (v: any) => string;
  config?: ChartConfig;
  active?: boolean;
  label?: any;
  payload?: Array<{ dataKey?: string; value?: number; name?: string }>;
}) {
  const { labelFormatter, valueFormatter, config, active, label, payload } = props;
  if (!active || !payload || payload.length === 0) return null;
  const labelText =
    labelFormatter != null ? labelFormatter(label) : String(label ?? "");
  const entries = payload.map((p) => ({
    name: p?.dataKey,
    value: p?.value,
    color:
      p?.dataKey === "desktop"
        ? "var(--color-desktop)"
        : p?.dataKey === "mobile"
        ? "var(--color-mobile)"
        : "#999",
    label:
      (p?.dataKey && config?.[p.dataKey]?.label) ||
      (p?.dataKey === "desktop"
        ? "In Progress"
        : p?.dataKey === "mobile"
          ? "Mobile"
          : p?.name || ""),
  }));
  return (
    <div className="rounded-xl bg-black text-white px-3 py-2 text-xs shadow-2xl">
      <div className="font-bold">{labelText}</div>
      <div className="mt-1 space-y-1">
        {entries.map((e, idx) => (
          <div key={idx} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: e.color }}
              />
              {e.label}
            </span>
            <span className="font-bold">
              {valueFormatter
                ? valueFormatter(e.value)
                : typeof e.value === "number"
                  ? e.value.toLocaleString("id-ID")
                  : String(e.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartTooltip({
  cursor = false,
  content,
}: {
  cursor?: boolean;
  content: React.ReactNode;
}) {
  // Wrap recharts Tooltip to use our content; payload will be handled by recharts
  return <Tooltip cursor={cursor} content={content as any} />;
}

export function ChartLegend({ content }: { content: React.ReactNode }) {
  return <div className="mt-2 text-center">{content}</div>;
}

export function ChartLegendContent() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs">
      <div className="flex items-center gap-1">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "var(--color-mobile)" }}
        />
        <span>Mobile</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "var(--color-desktop)" }}
        />
        <span>Desktop</span>
      </div>
    </div>
  );
}
