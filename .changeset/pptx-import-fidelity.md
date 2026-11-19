---
"@textcortex/slidewise": minor
---

feat(pptx): import fidelity — charts, shapes, text, slides

A batch of importer / renderer fixes found by round-tripping a real deck
built with pptxgenjs. Each item has its own unit tests.

**Charts**
- Scatter, bubble and radar charts are imported and drawn (they used to become
  an "unknown element" placeholder). New fields: `ChartSeries.xValues`,
  `sizes`, `lines`, `ChartElement.xAxis`, `radarFilled`.
- A chart without `<c:legend>` shows no legend; `c:legendPos` is honoured
  (`showLegend`, `legendPosition`); line series use their `a:ln w` width.

**Shapes and pictures**
- Outlines for hexagon, moon, heart, lightning bolt, cloud and the wedge
  callouts (`presetShapes.ts`; they used to be plain rectangles).
- Outer shadows (`a:outerShdw`) on shapes.
- Picture transparency (`a:alphaModFix`) → `ImageElement.opacity`, also written
  back and drawn by the SVG renderer.
- Per-end line arrowheads (`headEnd` / `tailEnd`: triangle, stealth, oval,
  diamond) → `LineElement.startArrow` / `endArrow`; the legacy end triangle no
  longer lets the line show through its tip.

**Text**
- Superscript / subscript (`baseline`), vertical text (`bodyPr vert`),
  justified alignment, bullet colour (`buClr`), and the theme hyperlink colour
  for hyperlink runs.

**Slides and tables**
- Hidden slides (`show="0"`) are skipped in Play mode (`Slide.hidden`).
- Speaker notes are read into `Slide.notes`; slide transitions into
  `Slide.transition` and Play mode animates push / cover / wipe / fade.
- A table's frame grows to the sum of its row heights (`a:tr h`) when the
  graphic frame's `cy` is smaller, as PowerPoint does.
