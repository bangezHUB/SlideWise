import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptx } from "../index";
import { buildPresetShapePath } from "../presetShapes";

/**
 * Presets without a matching ShapeKind (hexagon, moon, heart, lightning bolt,
 * cloud, wedge callouts) get a synthesised outline instead of a rectangle.
 */

async function shapeFor(prst: string, avLst = "", flip = "", extraSpPr = "") {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  );
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`
  );
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`
  );
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );
  zip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm${flip}><a:off x="0" y="0"/><a:ext cx="3000000" cy="2000000"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst>${avLst}</a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>${extraSpPr}</p:spPr></p:sp></p:spTree></p:cSld></p:sld>`
  );
  const deck = await parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
  return deck.slides[0].elements.find((e) => e.type === "shape" || e.type === "line");
}

describe("pptx importer — preset shape outlines", () => {
  for (const prst of [
    "hexagon",
    "moon",
    "heart",
    "lightningBolt",
    "cloud",
    "wedgeRectCallout",
    "wedgeRoundRectCallout",
  ]) {
    it(`gives ${prst} its own outline`, async () => {
      const el = await shapeFor(prst);
      expect(el?.type).toBe("shape");
      if (el?.type !== "shape") return;
      expect(el.path?.d).toMatch(/^M /);
      expect(el.path?.d).not.toContain("NaN");
      expect(el.path?.viewW).toBeGreaterThan(1);
    });
  }

  it("hexagon is a six-point polygon with points on the left and right edges", () => {
    const p = buildPresetShapePath("hexagon", undefined, 300, 200, false, false)!;
    expect(p.d.match(/L/g)).toHaveLength(5);
    expect(p.d.startsWith("M 0.00 100.00")).toBe(true);
    expect(p.d).toContain("L 300.00 100.00");
  });

  it("callout pointer lands on the tip given by adj1/adj2", () => {
    const geom = {
      "a:avLst": {
        "a:gd": [
          { "@_name": "adj1", "@_fmla": "val -50000" },
          { "@_name": "adj2", "@_fmla": "val 100000" },
        ],
      },
    };
    const p = buildPresetShapePath("wedgeRectCallout", geom, 300, 200, false, false)!;
    // tip = centre + (-0.5 W, +1.0 H) = (-0, 300), below the box
    expect(p.d).toContain("L 0.00 300.00");
  });

  it("flipH mirrors the outline", () => {
    const a = buildPresetShapePath("lightningBolt", undefined, 100, 100, false, false)!;
    const b = buildPresetShapePath("lightningBolt", undefined, 100, 100, true, false)!;
    expect(a.d).not.toEqual(b.d);
    expect(a.d.startsWith("M 39.22 0.00")).toBe(true);
    expect(b.d.startsWith("M 60.78 0.00")).toBe(true);
  });

  it("reads an outer shadow from the effect list", async () => {
    // 4pt blur, 3pt distance straight down (dir 90°), 40% black.
    const el = await shapeFor(
      "roundRect",
      "",
      "",
      `<a:effectLst><a:outerShdw blurRad="50800" dist="38100" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="40000"/></a:srgbClr></a:outerShdw></a:effectLst>`
    );
    expect(el?.type).toBe("shape");
    if (el?.type !== "shape") return;
    expect(el.shadow).toBeTruthy();
    expect(el.shadow!.blur).toBeGreaterThan(0);
    expect(Math.abs(el.shadow!.offsetX)).toBeLessThan(0.5);
    expect(el.shadow!.offsetY).toBeGreaterThan(2);
    expect(el.shadow!.color).toMatch(/^(#[0-9a-f]{8}|rgba\()/i);
  });

  it("keeps which end of a line has which arrowhead", async () => {
    const parse = async (ends: string) => {
      const zipEl = await shapeFor("line", "", "", `<a:ln w="25400"><a:solidFill><a:srgbClr val="112233"/></a:solidFill>${ends}</a:ln>`);
      return zipEl as unknown as { type: string; startArrow?: string; endArrow?: string };
    };
    const oval = await parse(`<a:headEnd type="oval"/>`);
    expect(oval.startArrow).toBe("oval");
    expect(oval.endArrow).toBeUndefined();
    const both = await parse(`<a:headEnd type="diamond"/><a:tailEnd type="triangle"/>`);
    expect([both.startArrow, both.endArrow]).toEqual(["diamond", "triangle"]);
    const none = await parse(`<a:headEnd type="none"/>`);
    expect(none.startArrow).toBeUndefined();
  });

  it("has no shadow without an effect list", async () => {
    const el = await shapeFor("roundRect");
    expect(el?.type === "shape" && el.shadow).toBeFalsy();
  });

  it("leaves presets with a ShapeKind alone", () => {
    expect(buildPresetShapePath("rect", undefined, 100, 100, false, false)).toBeUndefined();
  });
});
