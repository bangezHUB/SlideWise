import { describe, it, expect } from "vitest";
import { fitImageBox, limitSide } from "../pickImage";

describe("fitImageBox", () => {
  it("keeps the aspect ratio inside the box", () => {
    expect(fitImageBox({ width: 400, height: 200 }, { w: 300, h: 300 })).toEqual({ w: 300, h: 150 });
    expect(fitImageBox({ width: 200, height: 400 }, { w: 300, h: 300 })).toEqual({ w: 150, h: 300 });
  });

  it("scales a small image up to the box too", () => {
    expect(fitImageBox({ width: 10, height: 10 }, { w: 100, h: 50 })).toEqual({ w: 50, h: 50 });
  });

  it("falls back to the box for a zero-size image", () => {
    expect(fitImageBox({ width: 0, height: 0 }, { w: 80, h: 60 })).toEqual({ w: 80, h: 60 });
  });
});

describe("limitSide", () => {
  it("scales down only when the longer side exceeds the limit", () => {
    expect(limitSide(3200, 1600, 1600)).toEqual({ w: 1600, h: 800 });
    expect(limitSide(800, 600, 1600)).toEqual({ w: 800, h: 600 });
  });
});
