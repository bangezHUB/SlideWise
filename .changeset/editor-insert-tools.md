---
"@textcortex/slidewise": minor
---

fix(editor): insert tools work; shape / line / icon galleries; change type of existing shapes

**Bug.** Picking a tool in the bottom toolbar (text, shape, line, image, …) and
dragging on the slide created nothing. The slide surface only started an insert
when the press hit the surface element itself, but its only child — the scaled
element layer — covers it completely, so the press always landed on that layer.
For the same reason a click on blank slide area never cleared the selection.
`slidePressAction()` now decides what a press does: with an insert tool it
starts the element wherever it lands, with the select tool it clears the
selection on blank area.

**Image tool.** Instead of inserting a stock photo from the internet, the tool
opens the file chooser, scales large photos down (longest side 1600 px) and fits
the picture into the dragged box.

**Galleries.** The Shape, Line and Icon buttons open a gallery: 21 shapes
(rectangle, rounded, circle, triangle, diamond, star, hexagon, octagon,
parallelogram, trapezoid, plus, four block arrows, heart, cloud, moon,
lightning bolt, two callouts), 10 line styles (dashed, dotted, dash-dot, arrow,
double arrow, dashed arrow, dot / diamond ends, stealth) and 24 icon glyphs.
The choice is kept in the store (`toolOption`, `setTool(tool, option)`).
`presetShapes` gained octagon, parallelogram, trapezoid, plus and the four
block arrows (the importer draws them too instead of plain rectangles); the
line writer emits begin / end arrowheads.

**Existing elements.** The floating toolbar of a selected shape has a "Shape
type" menu and that of a line a "Line style" menu using the same catalogs;
position, size, fill and stroke are kept.

Depends on the import-fidelity changes (preset outlines, line arrowheads).
