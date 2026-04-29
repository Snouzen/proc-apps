"use client";
import * as React from "react";
import { Bar, BarChart as ReBarChart, CartesianGrid, XAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";
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
export function ChartAreaInteractive({
  role,
  regional,
}: {
  role: "pusat" | "rm" | null;
  regional: string | null;
}) {
  const [timeRange, setTimeRange] = React.useState("90d");
  const [series, setSeries] = React.useState<
    Array<{ date: string; mobile: number }>
  >([]);
  const [loading, setLoading] = React.useState(false);

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
    if (!role) return;
    let mounted = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("metric", "kg");
        params.set("days", String(days));
        params.set("includeUnknown", "true");
        if (role === "rm" && regional) params.set("regional", regional);
        const res = await fetch(`/api/po/trend?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!mounted) return;
        if (!res.ok || !json) {
          setSeries([]);
        } else {
          const rows: Array<{ date: string; kg: number }> = Array.isArray(
            (json as any)?.data,
          )
            ? (json as any).data
            : [];
          setSeries(
            rows.map((r) => ({
              date: String(r.date || ""),
              mobile: Number(r.kg) || 0,
            })),
          );
        }
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        if (mounted) setSeries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 100);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [role, regional, days]);

  const filteredData = series;

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
        <div className="sm:ml-auto relative">
          <SmoothSelect
            width={184}
            value={timeRange}
            onChange={(v) => setTimeRange(v)}
            options={[
              { value: "90d", label: "Last 3 months" },
              { value: "30d", label: "Last 30 days" },
              { value: "7d", label: "Last 7 days" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <ReBarChart data={filteredData}>
            <defs>
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
            <Bar
              dataKey="mobile"
              fill="url(#fillMobile)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
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
          </ReBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
