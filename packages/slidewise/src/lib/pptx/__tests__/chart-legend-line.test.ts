import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import { parsePptx } from "../index";
import type { ChartElement } from "@/lib/types";

/** Legend visibility and line width of imported charts. */

async function chartWith(options: Record<string, unknown>): Promise<ChartElement> {
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  slide.addChart(
    pptx.ChartType.line,
    [{ name: "Points", labels: ["a", "b", "c"], values: [1, 3, 2] }],
    { x: 0, y: 0, w: 5, h: 3, ...options }
  );
  const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  const zip = await JSZip.loadAsync(buffer);
  const deck = await parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
  return deck.slides[0].elements.find((e): e is ChartElement => e.type === "chart")!;
}

describe("pptx importer — chart legend and line width", () => {
  it("marks a chart without <c:legend> as legend-less", async () => {
    expect((await chartWith({ showLegend: false })).showLegend).toBe(false);
  });

  it("leaves the legend on when <c:legend> exists, and reads its position", async () => {
    const c = await chartWith({ showLegend: true, legendPos: "r" });
    expect(c.showLegend).toBeUndefined();
    expect(c.legendPosition).toBe("r");
  });

  it("reads the series line width in pixels", async () => {
    const thick = await chartWith({ lineSize: 4 });
    const thin = await chartWith({ lineSize: 1 });
    expect(thick.series[0].lineWidth).toBeGreaterThan(thin.series[0].lineWidth!);
    expect(thick.series[0].lineWidth).toBeGreaterThan(3);
  });
});
