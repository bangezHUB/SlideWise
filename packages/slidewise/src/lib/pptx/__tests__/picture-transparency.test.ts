import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptx } from "../index";
import { synthesiseImage } from "../pptxWriters";
import { renderDeckToSvg } from "@/lib/render/renderDeck";
import type { ImageElement } from "@/lib/types";

/**
 * "Picture Transparency" in PowerPoint is `<a:alphaModFix amt>` inside the
 * blip. It must survive import, drawing and the hand-written `<p:pic>` writer.
 */

const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function imageFor(blipInner: string): Promise<ImageElement | undefined> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/></Types>`
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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`
  );
  zip.file("ppt/media/image1.png", PNG_1PX, { base64: true });
  zip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:pic><p:nvPicPr><p:cNvPr id="2" name="p"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId9">${blipInner}</a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="2000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`
  );
  const deck = await parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
  const el = deck.slides[0].elements.find((e) => e.type === "image");
  return el?.type === "image" ? el : undefined;
}

describe("picture transparency (a:alphaModFix)", () => {
  it("reads the opacity from alphaModFix", async () => {
    const el = await imageFor(`<a:alphaModFix amt="40000"/>`);
    expect(el?.opacity).toBeCloseTo(0.4, 5);
  });

  it("leaves opacity unset for opaque pictures", async () => {
    expect((await imageFor(""))?.opacity).toBeUndefined();
    expect((await imageFor(`<a:alphaModFix amt="100000"/>`))?.opacity).toBeUndefined();
  });

  it("writes alphaModFix back for a synthesised picture", async () => {
    const el = (await imageFor(`<a:alphaModFix amt="25000"/>`))!;
    const out = synthesiseImage(el);
    expect(out?.xml).toContain(`<a:alphaModFix amt="25000"/>`);
  });

  it("applies opacity in the SVG renderer", async () => {
    const el = (await imageFor(`<a:alphaModFix amt="50000"/>`))!;
    const [svg] = await renderDeckToSvg({
      version: 1,
      title: "t",
      slides: [{ id: "s", background: "#fff", elements: [el] }],
    } as never);
    expect(svg).toContain(`opacity="0.5"`);
  });
});
