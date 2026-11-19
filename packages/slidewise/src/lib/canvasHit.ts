import type { Tool } from "./store";

/** Marks the scaled layer that holds the slide's elements (a direct child of the slide surface). */
export const SLIDE_LAYER_ATTR = "data-slide-layer";

/**
 * What a mouse-down on the slide surface should do.
 *
 * The surface's only child is the scaled element layer, which covers it
 * completely, so a click on empty slide area hits that layer, not the surface
 * itself — both count as "blank". While an insert tool (text, shape, line, …)
 * is active the press starts the new element wherever it lands, also over an
 * existing element, as in PowerPoint.
 */
export function slidePressAction(
  tool: Tool,
  target: object | null,
  currentTarget: object | null
): "create" | "clear" | "none" {
  if (tool !== "select") return "create";
  const el = target as { getAttribute?: (n: string) => string | null } | null;
  const blank = target === currentTarget || el?.getAttribute?.(SLIDE_LAYER_ATTR) === "1";
  return blank ? "clear" : "none";
}
