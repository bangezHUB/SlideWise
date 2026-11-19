import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptx } from "../index";
import { enterMotion } from "@/lib/slideTransition";

/** Speaker notes (`notesSlide`) and slide transitions (`p:transition`). */

const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;

async function deck(opts: { transition?: string; notesParas?: string[] }) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>`
  );
  zip.file("_rels/.rels", `${XML}<Relationships xmlns="${REL}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  zip.file("ppt/presentation.xml", `${XML}<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", `${XML}<Relationships xmlns="${REL}"><Relationship Id="rId2" Type="${R}/slide" Target="slides/slide1.xml"/></Relationships>`);
  const notesRel = opts.notesParas
    ? `<Relationship Id="rId7" Type="${R}/notesSlide" Target="../notesSlides/notesSlide1.xml"/>`
    : "";
  zip.file("ppt/slides/_rels/slide1.xml.rels", `${XML}<Relationships xmlns="${REL}">${notesRel}</Relationships>`);
  zip.file(
    "ppt/slides/slide1.xml",
    `${XML}<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree/></p:cSld>${opts.transition ?? ""}</p:sld>`
  );
  if (opts.notesParas) {
    const paras = opts.notesParas
      .map((t) => `<a:p><a:r><a:rPr lang="en-US"/><a:t>${t}</a:t></a:r></a:p>`)
      .join("");
    zip.file(
      "ppt/notesSlides/notesSlide1.xml",
      `${XML}<p:notes xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree>` +
        `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr/><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>` +
        `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody></p:sp>` +
        `</p:spTree></p:cSld></p:notes>`
    );
  }
  return parsePptx(await zip.generateAsync({ type: "arraybuffer" }));
}

describe("pptx importer — speaker notes", () => {
  it("reads the notes text, one line per paragraph", async () => {
    const d = await deck({ notesParas: ["Say hello", "Then &amp; demo"] });
    expect(d.slides[0].notes).toBe("Say hello\nThen & demo");
  });

  it("leaves notes unset when the slide has none", async () => {
    expect((await deck({})).slides[0].notes).toBeUndefined();
  });
});

describe("pptx importer — slide transitions", () => {
  it("reads a push transition with direction and speed", async () => {
    const d = await deck({ transition: `<p:transition spd="slow"><p:push dir="l"/></p:transition>` });
    expect(d.slides[0].transition).toEqual({ type: "push", direction: "l", speed: "slow" });
  });

  it("reads a transition wrapped in mc:AlternateContent", async () => {
    const d = await deck({
      transition: `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="p14" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"><p:transition spd="med"><p:fade/></p:transition></mc:Choice><mc:Fallback><p:transition spd="med"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`,
    });
    expect(d.slides[0].transition).toEqual({ type: "fade", speed: "med" });
  });

  it("has no transition when the slide declares none", async () => {
    expect((await deck({})).slides[0].transition).toBeUndefined();
  });
});

describe("enterMotion", () => {
  it("fades by default and slides in for push", () => {
    expect(enterMotion(undefined, 800, 450).initial).toEqual({ opacity: 0 });
    const push = enterMotion({ type: "push", direction: "l" }, 800, 450);
    expect(push.initial).toEqual({ opacity: 1, x: 800 });
    expect(enterMotion({ type: "wipe", direction: "d" }, 800, 450).initial).toEqual({ opacity: 1, y: -450 });
  });

  it("scales the duration with the speed", () => {
    const slow = enterMotion({ type: "fade", speed: "slow" }, 1, 1).duration;
    const fast = enterMotion({ type: "fade", speed: "fast" }, 1, 1).duration;
    expect(slow).toBeGreaterThan(fast);
  });
});
