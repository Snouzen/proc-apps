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

export function ChartTooltipContent({
  labelFormatter,
  indicator,
}: {
  labelFormatter?: (v: any) => string;
  indicator?: "dot" | "line";
}) {
  return (
    <div className="rounded-xl bg-black text-white px-3 py-2 text-xs shadow-2xl">
      <div className="font-bold">Tooltip</div>
      {/* The actual content is rendered by ChartTooltip via payload */}
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
  return (
    <Tooltip cursor={cursor} content={content as any} />
  );
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
