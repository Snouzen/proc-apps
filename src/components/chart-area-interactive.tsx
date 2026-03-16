"use client";
import * as React from "react";
import { Area, AreaChart as ReAreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const description = "An interactive area chart";

const chartConfig = {
  mobile: { label: "Total KG", color: "#38bdf8" },
} satisfies ChartConfig;
export function ChartAreaInteractive({ poData }: { poData?: any[] }) {
  const [timeRange, setTimeRange] = React.useState("90d");
  const [series, setSeries] = React.useState<
    Array<{ date: string; mobile: number }>
  >([]);

  const toYMD = (d: Date) => {
    return d.toISOString().slice(0, 10);
  };
  const safeParseDate = (input: any): Date | null => {
    if (!input) return null;
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === "string") {
      // Common ISO format: use first 10 chars (YYYY-MM-DD) to avoid TZ issues
      const isoPart = input.length >= 10 ? input.slice(0, 10) : input;
      const tryIso = new Date(isoPart);
      if (!isNaN(tryIso.getTime())) return tryIso;
      // Fallback dd/MM/yyyy
      if (input.includes("/")) {
        const parts = input.split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
          if (
            !Number.isNaN(dd) &&
            !Number.isNaN(mm) &&
            !Number.isNaN(yyyy) &&
            dd >= 1 &&
            dd <= 31 &&
            mm >= 1 &&
            mm <= 12
          ) {
            const dt = new Date(yyyy, mm - 1, dd);
            return isNaN(dt.getTime()) ? null : dt;
          }
        }
      }
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  };
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(
          `/api/po/trend?includeUnknown=true&metric=kg&days=${days}`,
          {
            cache: "no-store",
          },
        );
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        const next = rows.map((r: any) => ({
          date: String(r?.date || ""),
          mobile: Number(r?.kg) || 0,
        }));
        if (active) setSeries(next);
      } catch {
        if (active) setSeries([]);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [days]);

  const filteredData =
    series.length > 0
      ? series
      : (() => {
          const today = new Date();
          const dates: string[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(toYMD(d));
          }
          const rows = Array.isArray(poData) ? poData : [];
          const byDate = new Map<string, { kg: number }>();
          for (const d of dates) byDate.set(d, { kg: 0 });
          for (const po of rows) {
            const dt = safeParseDate(po?.tglPo);
            const t = dt ? toYMD(dt) : null;
            if (!t || !byDate.has(t)) continue;
            const items = Array.isArray(po?.Items) ? po.Items : [];
            const kg = items.reduce((acc: number, it: any) => {
              const pcs = Number(it?.pcs) || 0;
              const satuan = Number(it?.Product?.satuanKg ?? 1) || 1;
              return acc + pcs * satuan;
            }, 0);
            const rec = byDate.get(t)!;
            rec.kg += kg;
          }
          return dates.map((d) => {
            const rec = byDate.get(d)!;
            return {
              date: d,
              mobile: rec.kg,
            };
          });
        })();

  const rangeLabel =
    timeRange === "90d"
      ? "last 3 months"
      : timeRange === "30d"
        ? "last 30 days"
        : "last 7 days";

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Total KG Overview</CardTitle>
          <CardDescription>
            Showing total KG for the {rangeLabel}
          </CardDescription>
        </div>
        <div className="sm:ml-auto">
          <select
            className="w-[160px] rounded-lg border border-gray-200 text-sm px-3 py-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Select time range"
          >
            <option value="90d">Last 3 months</option>
            <option value="30d">Last 30 days</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <ReAreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => String(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(v: any) => String(v)}
                  config={chartConfig}
                  valueFormatter={(v: any) =>
                    `${Number(v || 0).toLocaleString("id-ID")} kg`
                  }
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <ChartLegend
              content={
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: "var(--color-mobile)" }}
                    />
                    <span>Total KG</span>
                  </div>
                </div>
              }
            />
          </ReAreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
