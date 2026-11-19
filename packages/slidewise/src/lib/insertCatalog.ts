import type { DashType, ArrowheadKind, ElementDraft, ShapeKind, ShapeElement, LineElement } from "./types";
import { buildPresetShapePath } from "./pptx/presetShapes";

/**
 * What the shape / line / icon insert tools can create. The bottom toolbar
 * shows these as a gallery; the chosen id travels in the store as `toolOption`
 * and `Canvas` turns it into an element with the functions below.
 */

export interface ShapeOption {
  id: string;
  label: string;
  /** Built-in shape kind drawn by the renderer. */
  kind?: ShapeKind;
  /** Preset outline from `presetShapes` (hexagon, arrows, callouts, …). */
  preset?: string;
}

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: "rect", label: "Rectangle", kind: "rect" },
  { id: "rounded", label: "Rounded rectangle", kind: "rounded" },
  { id: "circle", label: "Circle", kind: "circle" },
  { id: "triangle", label: "Triangle", kind: "triangle" },
  { id: "diamond", label: "Diamond", kind: "diamond" },
  { id: "star", label: "Star", kind: "star" },
  { id: "hexagon", label: "Hexagon", preset: "hexagon" },
  { id: "octagon", label: "Octagon", preset: "octagon" },
  { id: "parallelogram", label: "Parallelogram", preset: "parallelogram" },
  { id: "trapezoid", label: "Trapezoid", preset: "trapezoid" },
  { id: "plus", label: "Plus", preset: "plus" },
  { id: "rightArrow", label: "Right arrow", preset: "rightArrow" },
  { id: "leftArrow", label: "Left arrow", preset: "leftArrow" },
  { id: "upArrow", label: "Up arrow", preset: "upArrow" },
  { id: "downArrow", label: "Down arrow", preset: "downArrow" },
  { id: "heart", label: "Heart", preset: "heart" },
  { id: "cloud", label: "Cloud", preset: "cloud" },
  { id: "moon", label: "Moon", preset: "moon" },
  { id: "lightningBolt", label: "Lightning bolt", preset: "lightningBolt" },
  { id: "wedgeRectCallout", label: "Callout", preset: "wedgeRectCallout" },
  { id: "wedgeRoundRectCallout", label: "Rounded callout", preset: "wedgeRoundRectCallout" },
];

export interface LineOption {
  id: string;
  label: string;
  dashType?: DashType;
  startArrow?: ArrowheadKind;
  endArrow?: ArrowheadKind;
}

export const LINE_OPTIONS: LineOption[] = [
  { id: "solid", label: "Line" },
  { id: "dashed", label: "Dashed line", dashType: "dash" },
  { id: "dotted", label: "Dotted line", dashType: "dot" },
  { id: "dashDot", label: "Dash-dot line", dashType: "dashDot" },
  { id: "arrow", label: "Arrow", endArrow: "triangle" },
  { id: "doubleArrow", label: "Double arrow", startArrow: "triangle", endArrow: "triangle" },
  { id: "dashedArrow", label: "Dashed arrow", dashType: "dash", endArrow: "triangle" },
  { id: "dotEnd", label: "Line with dot", startArrow: "oval", endArrow: "oval" },
  { id: "diamondEnd", label: "Line with diamonds", startArrow: "diamond", endArrow: "diamond" },
  { id: "stealth", label: "Stealth arrow", endArrow: "stealth" },
];

export interface IconOption {
  /** The glyph drawn (and stored in `IconElement.icon`). */
  glyph: string;
  label: string;
}

export const ICON_OPTIONS: IconOption[] = [
  { glyph: "★", label: "Star" },
  { glyph: "♥", label: "Heart" },
  { glyph: "✓", label: "Check" },
  { glyph: "✗", label: "Cross" },
  { glyph: "➜", label: "Arrow" },
  { glyph: "☀", label: "Sun" },
  { glyph: "☁", label: "Cloud" },
  { glyph: "☂", label: "Umbrella" },
  { glyph: "⚡", label: "Lightning" },
  { glyph: "✿", label: "Flower" },
  { glyph: "☎", label: "Phone" },
  { glyph: "✉", label: "Mail" },
  { glyph: "⚑", label: "Flag" },
  { glyph: "♪", label: "Music" },
  { glyph: "⚙", label: "Gear" },
  { glyph: "☺", label: "Smile" },
  { glyph: "✦", label: "Sparkle" },
  { glyph: "✔", label: "Heavy check" },
  { glyph: "⚠", label: "Warning" },
  { glyph: "?", label: "Question" },
  { glyph: "!", label: "Exclamation" },
  { glyph: "♛", label: "Crown" },
  { glyph: "⌛", label: "Hourglass" },
  { glyph: "✎", label: "Pencil" },
];

type Box = { x: number; y: number; w: number; h: number; rotation: number };

const SHAPE_FILL = "#4F5BD5";

export function shapeDraft(optionId: string | null, box: Box): ElementDraft {
  const opt = SHAPE_OPTIONS.find((o) => o.id === optionId) ?? SHAPE_OPTIONS[1];
  if (opt.preset) {
    const path = buildPresetShapePath(opt.preset, undefined, box.w, box.h, false, false);
    return { ...box, type: "shape", shape: "rect", fill: SHAPE_FILL, ...(path ? { path } : {}) };
  }
  return {
    ...box,
    type: "shape",
    shape: opt.kind ?? "rounded",
    fill: SHAPE_FILL,
    ...(opt.kind === "rounded" ? { radius: 16 } : {}),
  };
}

export function lineDraft(optionId: string | null, box: Box): ElementDraft {
  const opt = LINE_OPTIONS.find((o) => o.id === optionId) ?? LINE_OPTIONS[0];
  return {
    ...box,
    h: Math.max(2, box.h),
    type: "line",
    stroke: "#0E1330",
    strokeWidth: 4,
    ...(opt.dashType ? { dashType: opt.dashType } : {}),
    ...(opt.startArrow ? { startArrow: opt.startArrow } : {}),
    ...(opt.endArrow ? { endArrow: opt.endArrow, arrow: true } : {}),
  };
}

export function iconDraft(glyph: string | null, box: Box): ElementDraft {
  return { ...box, type: "icon", icon: glyph || ICON_OPTIONS[0].glyph, color: SHAPE_FILL };
}

/** SVG path `d` (in a `w × h` box) that previews a shape option in the gallery. */
export function shapePreviewPath(opt: ShapeOption, w: number, h: number): string {
  if (opt.preset) return buildPresetShapePath(opt.preset, undefined, w, h, false, false)?.d ?? "";
  switch (opt.kind) {
    case "circle":
      return `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 1 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 1 0 ${h / 2} Z`;
    case "triangle":
      return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    case "diamond":
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : 0.42;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(w / 2 + (w / 2) * r * Math.cos(a)).toFixed(2)} ${(h / 2 + (h / 2) * r * Math.sin(a)).toFixed(2)}`);
      }
      return `M ${pts.join(" L ")} Z`;
    }
    case "rounded": {
      const r = Math.min(w, h) * 0.25;
      return `M ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
}

/**
 * Patch that turns an existing shape into another catalog shape (`updateElement`).
 * Keeps position, size, fill and stroke; swaps the kind and outline.
 */
export function shapeChangePatch(
  optionId: string,
  el: { w: number; h: number; radius?: number }
): Partial<ShapeElement> {
  const opt = SHAPE_OPTIONS.find((o) => o.id === optionId);
  if (!opt) return {};
  if (opt.preset) {
    const path = buildPresetShapePath(opt.preset, undefined, el.w, el.h, false, false);
    return { shape: "rect", path, radius: undefined };
  }
  return {
    shape: opt.kind ?? "rounded",
    path: undefined,
    radius: opt.kind === "rounded" ? el.radius || 16 : undefined,
  };
}

/** Patch that gives an existing line another catalog style (dash and arrowheads). */
export function lineChangePatch(optionId: string): Partial<LineElement> {
  const opt = LINE_OPTIONS.find((o) => o.id === optionId);
  if (!opt) return {};
  return {
    dashType: opt.dashType ?? "solid",
    dashed: false,
    startArrow: opt.startArrow,
    endArrow: opt.endArrow,
    arrow: !!opt.endArrow,
  };
}
