"use client";

import * as React from "react";
import * as Recharts from "recharts";

import { cn } from "./utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
  return ctx;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
  id?: string;
};

const ChartContainer: React.FC<ChartContainerProps> = ({ id, className, children, config, ...props }) => {
  const rawId = React.useId ? String(React.useId()) : "";
  const safeId = (id || rawId).replace(/:/g, "");
  const chartId = `chart-${safeId}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={chartId} className={cn("flex aspect-video justify-center text-xs", className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

const ChartStyle: React.FC<{ id: string; config: ChartConfig }> = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([, c]) => c.color || c.theme
  );
  if (!colorConfig.length) return null;

  const styleString = Object.entries(THEMES)
    .map(
      ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, cfg]) => {
    const color = cfg.theme?.[theme as keyof typeof cfg.theme] || cfg.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}`
    )
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: styleString }} />;
};

// Tooltip
export const ChartTooltip = Recharts.Tooltip;

export type ChartTooltipContentProps = {
  active?: boolean;
  // Recharts types can differ between versions; use `any` to avoid type errors
  payload?: any[];
  label?: string;
};

export function ChartTooltipContent({ active, payload }: ChartTooltipContentProps) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border p-2 rounded shadow">
      {payload.map((p: any, i: number) => {
        const key = p.name || p.dataKey || `value-${i}`;
        const cfg = config[String(key)];
        return (
          <div key={String(key)} className="flex items-center gap-2">
            {cfg?.icon && <cfg.icon />}
            <span>{cfg?.label ?? p.name}</span>
            <span>{p.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// Legend
export type ChartLegendContentProps = {
  // Recharts types vary by version; use `any` here for compatibility
  payload?: any[];
  hideIcon?: boolean;
  nameKey?: string;
  verticalAlign?: "top" | "bottom" | "middle";
  className?: string;
};

export function ChartLegendContent({
  payload,
  hideIcon = false,
  nameKey,
  verticalAlign = "bottom",
  className,
}: ChartLegendContentProps) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {payload.map((item: any, i: number) => {
        const key = nameKey || String(item.dataKey ?? `value-${i}`);
        const cfg = config[String(key)];

        return (
          <div key={String(key)} className="flex items-center gap-1.5">
            {!hideIcon && !cfg?.icon && (
              <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
            )}
            {cfg?.icon && <cfg.icon />}
            {cfg?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

// Helper for payload
function getPayloadConfigFromPayload(config: ChartConfig, payload: any, key: string) {
  return config[key];
}
