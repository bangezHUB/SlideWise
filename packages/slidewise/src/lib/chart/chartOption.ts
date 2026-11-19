import type { EChartsOption } from "echarts";
import type { ChartElement, ChartSeries, ChartValueAxis } from "@/lib/types";

/**
 * Chart-option helpers shared by the in-editor renderer (`ChartView` in
 * `ElementView`) and exported from the package's public API so hosts can build
 * the exact same ECharts options for their own previews (e.g. a server-side
 * render-to-image pipeline) without re-implementing — and drifting from — the
 * package's chart translation.
 *
 * These are pure functions: no React, no DOM, no ECharts runtime import (only
 * the option-shape types), so they're safe to call in any environment.
 */

/**
 * Translate a Slidewise {@link ChartElement} into an ECharts option object.
 * Handles bar / column / line / area / pie / doughnut, including stacked +
 * percent-stacked variants and combo charts (series with their own `kind`,
 * optionally on a secondary value axis). Value labels are surfaced when the
 * source deck had `<c:showVal val="1"/>` on at least one series.
 */
export function buildChartOption(el: ChartElement): EChartsOption {
  const palette = el.series.map((s, i) => s.color ?? defaultPaletteColor(i));
  const isPercent = el.grouping === "percentStacked";
  const valueFormatter = makeValueFormatter(el.valueFormat, isPercent);
  // Data labels show the source values, also on percent-stacked charts
  // (where the plotted values are shares), as PowerPoint does.
  const labelFormatter = makeValueFormatter(el.valueFormat, false);

  if (el.kind === "pie" || el.kind === "doughnut") {
    const first = el.series[0];
    // One colour per slice: the parsed per-point colours (`null` = series
    // colour), else the palette in slice order.
    const sliceColor = (i: number): string =>
      first?.pointColors
        ? (first.pointColors[i] ?? first.color ?? defaultPaletteColor(i))
        : defaultPaletteColor(i);
    const data = el.categories.map((cat, i) => ({
      name: cat || `Slice ${i + 1}`,
      value: first?.values[i] ?? 0,
      itemStyle: { color: sliceColor(i) },
    }));
    return {
      color: el.categories.map((_, i) => sliceColor(i)),
      title: el.title ? { text: el.title, left: "center", top: 4 } : undefined,
      tooltip: { trigger: "item", valueFormatter },
      legend: legendOption(el),
      series: [
        {
          type: "pie",
          radius: el.kind === "doughnut" ? ["45%", "75%"] : "70%",
          data,
          label: el.showDataLabels
            ? { formatter: (p: { value: number }) => valueFormatter(p.value) }
            : { show: false },
        },
      ],
    } as EChartsOption;
  }

  if (el.kind === "scatter" || el.kind === "bubble") {
    return buildXyOption(el, palette, labelFormatter, valueFormatter);
  }
  if (el.kind === "radar") {
    return buildRadarOption(el, palette, labelFormatter, valueFormatter);
  }

  const isHorizontal = el.kind === "bar"; // "column" + everything else: vertical
  const hasSecondary = el.series.some((s) => s.secondaryAxis);
  const categoryAxis = {
    type: "category",
    data: el.categories,
    ...(el.categoryAxis?.reversed ? { inverse: true } : {}),
    ...(el.categoryAxis?.hidden ? { show: false } : {}),
  };
  // Bounds only when the source sets them: otherwise ECharts scales the axis
  // to the data, stacked totals included. Percent-stacked plots run 0..1.
  const valueAxis = (axis: ChartValueAxis | undefined, secondary: boolean) => ({
    type: "value",
    axisLabel: {
      formatter: secondary ? makeValueFormatter(el.valueFormat, false) : valueFormatter,
    },
    ...(isPercent && !secondary ? { min: 0, max: 1 } : {}),
    ...(axis?.min !== undefined ? { min: axis.min } : {}),
    ...(axis?.max !== undefined ? { max: axis.max } : {}),
    ...(axis?.hidden ? { show: false } : {}),
    ...(secondary
      ? { position: isHorizontal ? "top" : "right", splitLine: { show: false } }
      : {}),
  });
  const valueAxes = hasSecondary
    ? [valueAxis(el.valueAxis, false), valueAxis(el.secondaryValueAxis, true)]
    : valueAxis(el.valueAxis, false);
  const xAxis = isHorizontal ? valueAxes : categoryAxis;
  const yAxis = isHorizontal ? categoryAxis : valueAxes;

  // Stacked groupings stack the series drawn as the chart's own kind, per
  // value axis; combo series of another kind are drawn on their own.
  const stacked = el.grouping === "stacked" || el.grouping === "percentStacked";
  const stackKeyOf = (s: ChartSeries): string | undefined =>
    stacked && (s.kind ?? el.kind) === el.kind
      ? s.secondaryAxis
        ? "total-secondary"
        : "total"
      : undefined;
  // Percent-stacked: each value becomes its share of the category's total
  // within its stack (PowerPoint draws 100% stacks from the raw values).
  const stackTotals = new Map<string, number[]>();
  if (isPercent) {
    for (const s of el.series) {
      const key = stackKeyOf(s);
      if (!key) continue;
      const totals = stackTotals.get(key) ?? el.categories.map(() => 0);
      s.values.forEach((v, i) => {
        totals[i] = (totals[i] ?? 0) + Math.abs(v ?? 0);
      });
      stackTotals.set(key, totals);
    }
  }

  const series = el.series.map((s, i) => {
    const color = s.color ?? defaultPaletteColor(i);
    const kind = s.kind ?? el.kind;
    const stackKey = stackKeyOf(s);
    const totals = stackKey ? stackTotals.get(stackKey) : undefined;
    const base = {
      name: s.name,
      type: kind === "line" || kind === "area" ? "line" : "bar",
      data: s.values.map((v, idx) => {
        const raw = v === null ? 0 : v;
        const value = totals ? (totals[idx] ? raw / totals[idx] : 0) : raw;
        const pointColor = s.pointColors?.[idx];
        return pointColor ? { value, itemStyle: { color: pointColor } } : value;
      }),
      // Pin the colour explicitly so ECharts can't reassign via palette
      // cycling when multiple series share the same `name` (PowerPoint
      // decks routinely do this — same label, distinct colour fills).
      itemStyle: { color },
      ...(kind === "area" ? { areaStyle: { color } } : {}),
      ...(kind === "line"
        ? {
            lineStyle: { color, ...(s.lineWidth ? { width: s.lineWidth } : {}) },
            symbol: "circle",
            symbolSize: 6,
          }
        : {}),
      ...(stackKey ? { stack: stackKey } : {}),
      ...(s.secondaryAxis && hasSecondary
        ? isHorizontal
          ? { xAxisIndex: 1 }
          : { yAxisIndex: 1 }
        : {}),
      label: el.showDataLabels
        ? {
            show: true,
            position: stackKey ? "inside" : "top",
            formatter: (p: { dataIndex: number; value: number }) =>
              labelFormatter(totals ? (s.values[p.dataIndex] ?? NaN) : p.value),
            fontSize: 11,
            color: stackKey ? "#FFFFFF" : "#111111",
          }
        : { show: false },
    };
    return base;
  });

  return {
    color: palette,
    title: el.title ? { text: el.title, left: "center", top: 4 } : undefined,
    tooltip: { trigger: "axis", valueFormatter },
    legend: legendOption(el, true),
    grid: {
      left: 56 + (el.showLegend !== false && el.legendPosition === "l" ? 90 : 0),
      right:
        (hasSecondary && !isHorizontal ? 56 : 24) +
        (el.showLegend !== false && el.legendPosition === "r" ? 90 : 0),
      top:
        (el.title ? 36 : 16) +
        (hasSecondary && isHorizontal ? 24 : 0) +
        (el.showLegend !== false && el.legendPosition === "t" ? 24 : 0),
      bottom: 56,
    },
    xAxis,
    yAxis,
    series,
  } as EChartsOption;
}

/** ECharts legend for the chart's legend settings (hidden, or placed by side). */
function legendOption(el: ChartElement, scroll = false) {
  if (el.showLegend === false) return { show: false };
  const type = scroll ? { type: "scroll" as const } : {};
  switch (el.legendPosition) {
    case "t":
      return { top: el.title ? 30 : 4, ...type };
    case "l":
      return { left: 4, top: "middle", orient: "vertical" as const, ...type };
    case "r":
      return { right: 4, top: "middle", orient: "vertical" as const, ...type };
    default:
      return { bottom: 4, ...type };
  }
}

const isNum = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n);

function xyAxis(axis: ChartValueAxis | undefined) {
  return {
    type: "value" as const,
    ...(axis?.min !== undefined ? { min: axis.min } : {}),
    ...(axis?.max !== undefined ? { max: axis.max } : {}),
    ...(axis?.hidden ? { show: false } : {}),
  };
}

/** Scatter and bubble charts: value axes and `[x, y(, size)]` points. */
function buildXyOption(
  el: ChartElement,
  palette: string[],
  labelFormatter: (v: number) => string,
  valueFormatter: (v: number) => string
): EChartsOption {
  const isBubble = el.kind === "bubble";
  const maxSize = Math.max(
    1,
    ...el.series.flatMap((s) => (s.sizes ?? []).filter(isNum))
  );
  const series = el.series.map((s) => {
    const data: number[][] = [];
    s.values.forEach((y, i) => {
      const x = s.xValues?.[i];
      if (!isNum(x) || !isNum(y)) return;
      const size = s.sizes?.[i];
      data.push(isBubble ? [x, y, isNum(size) ? size : 0] : [x, y]);
    });
    return {
      name: s.name,
      type: s.lines && !isBubble ? "line" : "scatter",
      data,
      ...(isBubble
        ? {
            // Area proportional to the value: radius ~ sqrt(size).
            symbolSize: (d: number[]) => 8 + 42 * Math.sqrt(Math.max(0, d[2]) / maxSize),
          }
        : { symbolSize: 8 }),
      itemStyle: { color: s.color ?? undefined, ...(isBubble ? { opacity: 0.7 } : {}) },
      ...(s.lines && !isBubble ? { lineStyle: { color: s.color ?? undefined } } : {}),
      label: el.showDataLabels
        ? {
            show: true,
            position: "top",
            fontSize: 11,
            formatter: (p: { value: number[] }) => labelFormatter(p.value[1]),
          }
        : { show: false },
    };
  });
  return {
    color: palette,
    title: el.title ? { text: el.title, left: "center", top: 4 } : undefined,
    tooltip: { trigger: "item", valueFormatter },
    legend: legendOption(el, true),
    grid: { left: 56, right: 24, top: el.title ? 36 : 16, bottom: 56 },
    xAxis: xyAxis(el.xAxis),
    yAxis: xyAxis(el.valueAxis),
    series,
  } as EChartsOption;
}

/** Radar charts: one indicator per category, one polygon per series. */
function buildRadarOption(
  el: ChartElement,
  palette: string[],
  labelFormatter: (v: number) => string,
  valueFormatter: (v: number) => string
): EChartsOption {
  const all = el.series.flatMap((s) => s.values.filter(isNum));
  const dataMax = all.length ? Math.max(...all) : 1;
  const dataMin = all.length ? Math.min(...all) : 0;
  const min = el.valueAxis?.min ?? Math.min(0, dataMin);
  const max = el.valueAxis?.max ?? (dataMax > min ? dataMax * 1.1 : min + 1);
  const data = el.series.map((s, i) => ({
    name: s.name,
    value: el.categories.map((_, ci) => s.values[ci] ?? 0),
    itemStyle: { color: palette[i] },
    lineStyle: { color: palette[i] },
    ...(el.radarFilled ? { areaStyle: { color: palette[i], opacity: 0.35 } } : {}),
  }));
  return {
    color: palette,
    title: el.title ? { text: el.title, left: "center", top: 4 } : undefined,
    tooltip: { trigger: "item", valueFormatter },
    legend: legendOption(el, true),
    radar: {
      indicator: el.categories.map((name, i) => ({ name: name || `#${i + 1}`, min, max })),
      center: ["50%", el.title ? "52%" : "47%"],
      radius: "62%",
    },
    series: [
      {
        type: "radar",
        data,
        label: el.showDataLabels
          ? { show: true, fontSize: 11, formatter: (p: { value: number }) => labelFormatter(p.value) }
          : { show: false },
      },
    ],
  } as EChartsOption;
}

/** Office-ish accent rotation, used when a series omits an explicit fill. */
export function defaultPaletteColor(i: number): string {
  const palette = [
    "#4F81BD",
    "#C0504D",
    "#9BBB59",
    "#8064A2",
    "#4BACC6",
    "#F79646",
  ];
  return palette[i % palette.length];
}

/**
 * Build a value formatter from a PPTX number `formatCode` (e.g. `"$#,##0.0"`).
 * `percent` renders the value as a whole-number percentage (for
 * percent-stacked charts whose values are 0..1 fractions).
 */
export function makeValueFormatter(
  formatCode: string | undefined,
  percent: boolean
): (value: number) => string {
  return (value: number) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "";
    if (percent) return `${Math.round(value * 100)}%`;
    if (formatCode && formatCode.includes("$")) {
      const decimals = (formatCode.match(/0\.(0+)/)?.[1] ?? "").length;
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }
    return value.toLocaleString();
  };
}
