"use client";

/**
 * `ChartFromSpec` — render a `ChartSpec` (from chart-spec.ts) using
 * recharts. Supports bar / line / area / pie. Wraps the chart in a
 * fixed-height container so SSR / streaming reflow stays sane.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  resolveSeriesColor,
  type ChartSeries,
  type ChartSpec,
} from "./chart-spec";

export interface ChartFromSpecProps {
  spec: ChartSpec;
  maxWidth?: number;
}

const TICK_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: "var(--fg-tertiary-srgb, #8B897F)",
} as const;

const TOOLTIP_STYLE = {
  background: "rgba(8, 17, 30, 0.95)",
  border: "1px solid rgba(180, 190, 210, 0.14)",
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#F1ECE0",
} as const;

const PIE_RADIUS_OUTER = 72;
const PIE_RADIUS_INNER_DONUT = 40;

export function ChartFromSpec({ spec, maxWidth = 560 }: ChartFromSpecProps) {
  const series: ChartSeries[] = spec.series ?? [];
  const seriesWithColors = series.map((s, i) => ({
    ...s,
    fill: resolveSeriesColor(s.color, i),
  }));

  return (
    <figure
      style={{
        margin: 0,
        maxWidth,
        display: "grid",
        gap: 8,
      }}
    >
      {spec.title && (
        <figcaption
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          {spec.title}
        </figcaption>
      )}
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(spec, seriesWithColors)}
        </ResponsiveContainer>
      </div>
      {spec.caption && (
        <span
          style={{
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            fontStyle: "italic",
          }}
        >
          {spec.caption}
        </span>
      )}
    </figure>
  );
}

function renderChart(
  spec: ChartSpec,
  series: (ChartSeries & { fill: string })[],
): React.ReactElement {
  switch (spec.type) {
    case "bar":
      return (
        <BarChart data={spec.data}>
          <CartesianGrid stroke="rgba(180, 190, 210, 0.08)" />
          <XAxis dataKey={spec.x} tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(196,169,106,0.08)" }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label ?? s.key} fill={s.fill} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={spec.data}>
          <CartesianGrid stroke="rgba(180, 190, 210, 0.08)" />
          <XAxis dataKey={spec.x} tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.fill}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={spec.data}>
          <CartesianGrid stroke="rgba(180, 190, 210, 0.08)" />
          <XAxis dataKey={spec.x} tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.fill}
              fill={s.fill}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    case "pie": {
      const palette = spec.data.map((_, i) => resolveSeriesColor(undefined, i));
      return (
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Pie
            data={spec.data}
            dataKey={spec.value!}
            nameKey={spec.name!}
            outerRadius={PIE_RADIUS_OUTER}
            innerRadius={spec.donut ? PIE_RADIUS_INNER_DONUT : 0}
            paddingAngle={2}
          >
            {spec.data.map((_, i) => (
              <Cell key={i} fill={palette[i]} stroke="rgba(8,17,30,0.95)" strokeWidth={2} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
        </PieChart>
      );
    }
  }
}
