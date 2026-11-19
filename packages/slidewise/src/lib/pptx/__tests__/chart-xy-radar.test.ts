import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import { parsePptx } from "../index";
import type { ChartElement } from "@/lib/types";

/**
 * Scatter, bubble and radar charts used to fall through to an "unknown
 * element" placeholder. They now import as live charts.
 */

async function chartsFrom(add: (pptx: pptxgen, slide: ReturnType<pptxgen["addSlide"]>) => void) {
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  add(pptx, slide);
  const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  const zip = await JSZip.loadAsync(buffer);
  const deck = await parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
  return deck.slides[0].elements;
}

describe("pptx importer — scatter, bubble and radar charts", () => {
  it("imports a scatter chart with x and y values per series", async () => {
    const els = await chartsFrom((pptx, slide) => {
      slide.addChart(
        pptx.ChartType.scatter,
        [
          { name: "X", values: [1, 2, 3, 4] },
          { name: "Hours vs score", values: [10, 25, 22, 40] },
          { name: "Second", values: [5, 8, 30, 12] },
        ],
        { x: 0, y: 0, w: 5, h: 4 }
      );
    });
    const charts = els.filter((e): e is ChartElement => e.type === "chart");
    expect(els.some((e) => e.type === "unknown")).toBe(false);
    expect(charts).toHaveLength(1);
    const c = charts[0];
    expect(c.kind).toBe("scatter");
    expect(c.series.map((s) => s.name)).toEqual(["Hours vs score", "Second"]);
    expect(c.series[0].xValues).toEqual([1, 2, 3, 4]);
    expect(c.series[0].values).toEqual([10, 25, 22, 40]);
    expect(c.series[1].values).toEqual([5, 8, 30, 12]);
  });

  it("imports a bubble chart with bubble sizes", async () => {
    const els = await chartsFrom((pptx, slide) => {
      slide.addChart(
        pptx.ChartType.bubble,
        [
          { name: "X", values: [1, 2, 3] },
          { name: "Deals", values: [10, 20, 15], sizes: [4, 16, 9] },
        ],
        { x: 0, y: 0, w: 5, h: 4 }
      );
    });
    const c = els.find((e): e is ChartElement => e.type === "chart")!;
    expect(c.kind).toBe("bubble");
    expect(c.series[0].xValues).toEqual([1, 2, 3]);
    expect(c.series[0].values).toEqual([10, 20, 15]);
    expect(c.series[0].sizes).toEqual([4, 16, 9]);
  });

  it("imports a radar chart with categories and filled style", async () => {
    const els = await chartsFrom((pptx, slide) => {
      slide.addChart(
        pptx.ChartType.radar,
        [
          { name: "Team A", labels: ["Speed", "Power", "Skill"], values: [3, 5, 4] },
          { name: "Team B", labels: ["Speed", "Power", "Skill"], values: [4, 2, 5] },
        ],
        { x: 0, y: 0, w: 5, h: 4, radarStyle: "filled" }
      );
    });
    const c = els.find((e): e is ChartElement => e.type === "chart")!;
    expect(c.kind).toBe("radar");
    expect(c.categories).toEqual(["Speed", "Power", "Skill"]);
    expect(c.series.map((s) => s.values)).toEqual([[3, 5, 4], [4, 2, 5]]);
    expect(c.radarFilled).toBe(true);
  });
});
