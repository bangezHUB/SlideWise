import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptx } from "../index";
import type { TextElement } from "@/lib/types";

/**
 * Superscript / subscript: `<a:rPr baseline="30000">` raises a run,
 * a negative value lowers it (in thousandths of a percent of the font size).
 */

async function textFor(paragraph: string, vert = "horz"): Promise<TextElement | undefined> {
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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="t"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="4000000" cy="2000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr vert="${vert}"/><a:lstStyle/>${paragraph}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
  );
  const deck = await parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
  const el = deck.slides[0].elements.find((e) => e.type === "text");
  return el?.type === "text" ? el : undefined;
}

describe("pptx importer — bullet colour", () => {
  it("draws the bullet in its own run with the buClr colour", async () => {
    const el = await textFor(
      `<a:p><a:pPr marL="285750" indent="-285750"><a:buClr><a:srgbClr val="FF0000"/></a:buClr><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US"><a:solidFill><a:srgbClr val="0000FF"/></a:solidFill></a:rPr><a:t>item</a:t></a:r></a:p>`
    );
    const runs = el!.paragraphs?.[0].runs ?? el!.runs!;
    expect(runs[0].text).toMatch(/^•\s*$/);
    expect(runs[0].color?.toUpperCase()).toBe("#FF0000");
    expect(runs[1].text).toBe("item");
    expect(runs[1].color?.toUpperCase()).toBe("#0000FF");
    expect(el!.text).toMatch(/^•\s+item/);
  });

  it("leaves the bullet in the text run when it has no colour of its own", async () => {
    const el = await textFor(
      `<a:p><a:pPr marL="285750" indent="-285750"><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US"/><a:t>item</a:t></a:r></a:p>`
    );
    expect(el!.text).toMatch(/^•\s+item/);
    expect((el!.runs ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("pptx importer — justified text", () => {
  it('reads algn="just" as justify, on the element and per paragraph', async () => {
    const el = await textFor(
      `<a:p><a:pPr algn="just"/><a:r><a:t>one</a:t></a:r></a:p><a:p><a:pPr algn="l" marL="285750" indent="-285750"/><a:r><a:t>two</a:t></a:r></a:p>`
    );
    expect(el?.align).toBe("justify");
    expect(el?.paragraphs?.map((p) => p.align)).toEqual(["justify", "left"]);
  });
});

describe("pptx importer — hyperlink runs", () => {
  it("colours a hyperlink run with the theme hlink colour and underlines it", async () => {
    const el = await textFor(
      `<a:p><a:r><a:rPr lang="en-US"><a:hlinkClick r:id="rId5" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></a:rPr><a:t>link</a:t></a:r><a:r><a:rPr lang="en-US"/><a:t> plain</a:t></a:r></a:p>`
    );
    const [link, plain] = el!.runs!;
    expect(link.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(link.underline).toBe(true);
    expect(link.color).not.toBe(plain.color);
  });

  it("ignores the run fill on a hyperlink, as PowerPoint does", async () => {
    const el = await textFor(
      `<a:p><a:r><a:rPr lang="en-US"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:hlinkClick r:id="rId5" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></a:rPr><a:t>link</a:t></a:r><a:r><a:rPr lang="en-US"/><a:t> plain</a:t></a:r></a:p>`
    );
    expect(el!.runs![0].color?.toUpperCase()).not.toBe("#FF0000");
  });

  it("keeps the run colour when the link says to use the text colour", async () => {
    const el = await textFor(
      `<a:p><a:r><a:rPr lang="en-US"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:hlinkClick r:id="rId5" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><a:extLst><a:ext uri="{A12FA001-AC4F-418D-AE19-62706E023703}"><ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/></a:ext></a:extLst></a:hlinkClick></a:rPr><a:t>link</a:t></a:r><a:r><a:rPr lang="en-US"/><a:t> plain</a:t></a:r></a:p>`
    );
    expect(el!.runs![0].color?.toUpperCase()).toBe("#FF0000");
  });
});

describe("pptx importer — vertical text", () => {
  it("reads bodyPr vert", async () => {
    const withVert = async (vert: string) => {
      const el = await textFor(`<a:p><a:r><a:t>V</a:t></a:r></a:p>`, vert);
      return el?.vertical;
    };
    expect(await withVert("vert")).toBe("vert");
    expect(await withVert("eaVert")).toBe("vert");
    expect(await withVert("vert270")).toBe("vert270");
    expect(await withVert("horz")).toBeUndefined();
  });
});

describe("pptx importer — superscript / subscript", () => {
  it("reads baseline from run properties", async () => {
    const el = await textFor(
      `<a:p><a:r><a:rPr lang="en-US"/><a:t>H</a:t></a:r><a:r><a:rPr lang="en-US" baseline="-25000"/><a:t>2</a:t></a:r><a:r><a:rPr lang="en-US"/><a:t>O x</a:t></a:r><a:r><a:rPr lang="en-US" baseline="30000"/><a:t>2</a:t></a:r></a:p>`
    );
    const runs = el?.runs ?? [];
    expect(runs.map((r) => r.baseline)).toEqual([undefined, -25, undefined, 30]);
    expect(runs.map((r) => r.text).join("")).toBe("H2O x2");
  });

  it("treats baseline=0 as no shift", async () => {
    const el = await textFor(
      `<a:p><a:r><a:rPr lang="en-US" baseline="0"/><a:t>a</a:t></a:r><a:r><a:rPr lang="en-US" b="1"/><a:t>b</a:t></a:r></a:p>`
    );
    expect((el?.runs ?? []).every((r) => r.baseline === undefined)).toBe(true);
  });
});
