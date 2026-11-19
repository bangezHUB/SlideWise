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
    kind: "line",
    categories: ["a", "b"],
    series: [{ name: "S", values: [1, 2] }],
    ...overrides,
  };
}

describe("buildChartOption — legend and line width", () => {
  it("hides the legend when showLegend is false (every chart family)", () => {
    for (const kind of ["line", "column", "pie", "scatter", "radar"] as const) {
      const opt = buildChartOption(chart({ kind, showLegend: false })) as any;
      expect(opt.legend).toEqual({ show: false });
    }
  });

  it("keeps the bottom legend by default and honours the legend position", () => {
    expect((buildChartOption(chart({})) as any).legend.bottom).toBe(4);
    const right = (buildChartOption(chart({ legendPosition: "r" })) as any).legend;
    expect(right.right).toBe(4);
    expect(right.orient).toBe("vertical");
    expect((buildChartOption(chart({ legendPosition: "t" })) as any).legend.top).toBeDefined();
  });

  it("uses the series line width for line charts", () => {
    const opt = buildChartOption(
      chart({ series: [{ name: "S", values: [1, 2], lineWidth: 5 }] })
    ) as any;
    expect(opt.series[0].lineStyle.width).toBe(5);
  });
});
