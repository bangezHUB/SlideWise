import { describe, it, expect } from "vitest";
import { slidePressAction, SLIDE_LAYER_ATTR } from "../canvasHit";

const surface = {};
const layer = { getAttribute: (n: string) => (n === SLIDE_LAYER_ATTR ? "1" : null) };
const element = { getAttribute: () => null };

describe("slidePressAction", () => {
  it("starts a new element with an insert tool, on blank area or over an element", () => {
    for (const tool of ["text", "shape", "line", "image", "table", "icon", "embed", "formula"] as const) {
      expect(slidePressAction(tool, layer, surface)).toBe("create");
      expect(slidePressAction(tool, element, surface)).toBe("create");
      expect(slidePressAction(tool, surface, surface)).toBe("create");
    }
  });

  it("clears the selection when select is active and the press lands on blank slide", () => {
    expect(slidePressAction("select", surface, surface)).toBe("clear");
    expect(slidePressAction("select", layer, surface)).toBe("clear");
  });

  it("does nothing for select over an element", () => {
    expect(slidePressAction("select", element, surface)).toBe("none");
  });
});
