import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptx } from "../index";
import { playableSlides } from "@/lib/playableSlides";

/**
 * `<p:sld show="0">` marks a slide as hidden: PowerPoint lists it in the
 * editor but skips it in the slide show. The importer must carry the flag so
 * Play mode can skip it.
 */

function slideXml(show: string | null, label: string): string {
  const showAttr = show === null ? "" : ` show="${show}"`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"${showAttr}><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="t"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="4000000" cy="2000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${label}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
}

async function deckWith(shows: Array<string | null>) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`
  );
  const ids = shows.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("");
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`
  );
  const rels = shows
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
    )
    .join("");
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
  );
  shows.forEach((show, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml(show, `s${i + 1}`));
    zip.file(
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
    );
  });
  return parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
}

describe("pptx importer — hidden slides", () => {
  it('flags slides with show="0" and keeps them in the deck', async () => {
    const deck = await deckWith([null, "0", "1", "false"]);
    expect(deck.slides).toHaveLength(4);
    expect(deck.slides.map((s) => s.hidden === true)).toEqual([false, true, false, true]);
  });

  it("playableSlides drops hidden slides but never returns an empty list", async () => {
    const deck = await deckWith([null, "0", null]);
    expect(playableSlides(deck.slides)).toHaveLength(2);
    const allHidden = await deckWith(["0", "0"]);
    expect(playableSlides(allHidden.slides)).toHaveLength(2);
  });
});
