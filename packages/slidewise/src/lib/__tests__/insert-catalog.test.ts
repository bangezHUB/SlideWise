import { describe, it, expect } from "vitest";
import {
  SHAPE_OPTIONS,
  LINE_OPTIONS,
  ICON_OPTIONS,
  shapeDraft,
  lineDraft,
  iconDraft,
  shapePreviewPath,
} from "../insertCatalog";

const box = { x: 10, y: 20, w: 200, h: 120, rotation: 0 };

describe("insert catalog", () => {
  it("offers a real choice for shapes, lines and icons", () => {
    expect(SHAPE_OPTIONS.length).toBeGreaterThanOrEqual(15);
    expect(LINE_OPTIONS.length).toBeGreaterThanOrEqual(8);
    expect(ICON_OPTIONS.length).toBeGreaterThanOrEqual(16);
    for (const list of [SHAPE_OPTIONS, LINE_OPTIONS]) {
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    }
  });

  it("every shape option makes a shape draft and a drawable preview", () => {
    for (const opt of SHAPE_OPTIONS) {
      const d = shapeDraft(opt.id, box);
      expect(d.type).toBe("shape");
      if (opt.preset) expect((d as { path?: { d: string } }).path?.d).toMatch(/^M /);
      else expect((d as { shape: string }).shape).toBe(opt.kind);
      expect(shapePreviewPath(opt, 40, 30)).toMatch(/^M /);
    }
  });

  it("unknown ids fall back to the rounded rectangle", () => {
    expect((shapeDraft("nope", box) as { shape: string }).shape).toBe("rounded");
    expect((shapeDraft(null, box) as { shape: string }).shape).toBe("rounded");
  });

  it("line options set dash and arrowheads", () => {
    const dashed = lineDraft("dashed", box) as { dashType?: string };
    expect(dashed.dashType).toBe("dash");
    const dbl = lineDraft("doubleArrow", box) as { startArrow?: string; endArrow?: string; arrow?: boolean };
    expect([dbl.startArrow, dbl.endArrow, dbl.arrow]).toEqual(["triangle", "triangle", true]);
    const plain = lineDraft("solid", box) as { dashType?: string; endArrow?: string };
    expect(plain.dashType).toBeUndefined();
    expect(plain.endArrow).toBeUndefined();
  });

  it("icon draft carries the chosen glyph", () => {
    expect((iconDraft("♥", box) as { icon: string }).icon).toBe("♥");
    expect((iconDraft(null, box) as { icon: string }).icon).toBe(ICON_OPTIONS[0].glyph);
  });
});

import { shapeChangePatch, lineChangePatch } from "../insertCatalog";

describe("changing an existing element", () => {
  it("turns a shape into a preset outline sized to the element", () => {
    const p = shapeChangePatch("hexagon", { w: 300, h: 100 });
    expect(p.shape).toBe("rect");
    expect(p.path?.viewW).toBe(300);
    expect(p.path?.d).toMatch(/^M /);
  });

  it("turns a preset shape back into a plain kind and drops the outline", () => {
    const p = shapeChangePatch("circle", { w: 100, h: 100 });
    expect(p).toMatchObject({ shape: "circle", path: undefined });
    expect("path" in p).toBe(true);
    expect(shapeChangePatch("rounded", { w: 1, h: 1 }).radius).toBe(16);
    expect(shapeChangePatch("rounded", { w: 1, h: 1, radius: 30 }).radius).toBe(30);
  });

  it("ignores an unknown option", () => {
    expect(shapeChangePatch("nope", { w: 1, h: 1 })).toEqual({});
    expect(lineChangePatch("nope")).toEqual({});
  });

  it("line styles reset dash and arrowheads", () => {
    expect(lineChangePatch("solid")).toMatchObject({ dashType: "solid", arrow: false, endArrow: undefined });
    expect(lineChangePatch("dashedArrow")).toMatchObject({ dashType: "dash", endArrow: "triangle", arrow: true });
    expect(lineChangePatch("doubleArrow")).toMatchObject({ startArrow: "triangle", endArrow: "triangle" });
  });
});
