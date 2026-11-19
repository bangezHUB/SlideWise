import { describe, it, expect } from "vitest";
import { buildChartOption } from "../../../index";
import type { ChartElement } from "@/lib/types";

function chart(overrides: Partial<ChartElement>): ChartElement {
  return {
    id: "c1",
    type: "chart",
    x: 0,
    y: 0,
    w: 400,
    h: 300,
    rotation: 0,
    z: 1,
    kind: "scatter",
    categories: [],
    series: [],
    ...overrides,
  };
}

describe("buildChartOption — scatter, bubble, radar", () => {
  it("scatter: value axes and [x, y] points", () => {
    const opt = buildChartOption(
      chart({
        series: [{ name: "A", xValues: [1, 2], values: [10, 20] }],
        xAxis: { min: 0, max: 5 },
        valueAxis: { max: 30 },
      })
    ) as any;
    expect(opt.xAxis).toMatchObject({ type: "value", min: 0, max: 5 });
    expect(opt.yAxis).toMatchObject({ type: "value", max: 30 });
    expect(opt.series[0].type).toBe("scatter");
    expect(opt.series[0].data).toEqual([[1, 10], [2, 20]]);
    expect(opt.tooltip.trigger).toBe("item");
  });

  it("scatter: skips points without both coordinates; draws a line when asked", () => {
    const opt = buildChartOption(
      chart({
        series: [{ name: "A", xValues: [1, null, 3], values: [10, 20, 30], lines: true }],
      })
    ) as any;
    expect(opt.series[0].type).toBe("line");
    expect(opt.series[0].data).toEqual([[1, 10], [3, 30]]);
  });

  it("bubble: third value is the size and symbolSize scales with it", () => {
    const opt = buildChartOption(
      chart({
        kind: "bubble",
        series: [{ name: "A", xValues: [1, 2], values: [10, 20], sizes: [4, 16] }],
      })
    ) as any;
    expect(opt.series[0].data).toEqual([[1, 10, 4], [2, 20, 16]]);
    const size = opt.series[0].symbolSize as (d: number[]) => number;
    expect(size([2, 20, 16])).toBeGreaterThan(size([1, 10, 4]));
    expect(size([1, 10, 4])).toBeGreaterThan(0);
  });

  it("radar: indicators from the categories, one series entry per data series", () => {
    const opt = buildChartOption(
      chart({
        kind: "radar",
        categories: ["Speed", "Power", "Skill"],
        series: [
          { name: "A", values: [3, 5, 4] },
          { name: "B", values: [4, 2, 5], color: "#112233" },
        ],
        radarFilled: true,
      })
    ) as any;
    expect(opt.radar.indicator.map((i: { name: string }) => i.name)).toEqual([
      "Speed",
      "Power",
      "Skill",
    ]);
    expect(opt.radar.indicator.every((i: { max: number }) => i.max >= 5)).toBe(true);
    expect(opt.series[0].type).toBe("radar");
    expect(opt.series[0].data.map((d: { value: number[] }) => d.value)).toEqual([
      [3, 5, 4],
      [4, 2, 5],
    ]);
    expect(opt.series[0].data[0].areaStyle).toBeTruthy();
    expect(opt.series[0].data[1].itemStyle.color).toBe("#112233");
  });
});
