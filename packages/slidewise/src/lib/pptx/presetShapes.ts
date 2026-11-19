import type { ShapePath } from "@/lib/types";

/**
 * SVG outlines for preset shapes that have no matching `ShapeKind`: hexagon,
 * moon, heart, lightning bolt, cloud and the rectangular wedge callouts.
 * Without an outline they used to render as plain rectangles.
 *
 * The hexagon, moon (adj → crescent depth), lightning bolt and wedge-callout
 * geometry follow the ECMA-376 `presetShapeDefinitions` guides. Heart and
 * cloud are close approximations drawn with Bézier curves and arcs.
 *
 * `flipH` / `flipV` are baked into the coordinates (the same way the other
 * synthesised outlines do) so `rotation` still maps to a single CSS rotate.
 */

type Pt = [number, number];

function readAdj(prstGeom: any, name: string, fallback: number): number {
  const gds = prstGeom?.["a:avLst"]?.["a:gd"];
  const list = Array.isArray(gds) ? gds : gds ? [gds] : [];
  const gd = list.find((g: any) => g?.["@_name"] === name);
  const fmla: unknown = gd?.["@_fmla"];
  const m = typeof fmla === "string" ? /val\s+(-?\d+)/.exec(fmla) : null;
  return m ? Number(m[1]) : fallback;
}

const f2 = (n: number) => n.toFixed(2);

function polygon(pts: Pt[]): string {
  return "M " + pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join(" L ") + " Z";
}

/** Mirror a path built in top-left space. Only used for `M`/`L`/`C`/`A` data. */
function mirror(d: string, W: number, H: number, flipH: boolean, flipV: boolean): string {
  if (!flipH && !flipV) return d;
  const tokens = d.split(/\s+/);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "A") {
      // A rx ry rot large sweep x y
      const sweep = Number(tokens[i + 5]);
      const x = Number(tokens[i + 6]);
      const y = Number(tokens[i + 7]);
      const flipped = flipH !== flipV ? 1 - sweep : sweep;
      out.push(
        "A", tokens[i + 1], tokens[i + 2], tokens[i + 3], tokens[i + 4], String(flipped),
        f2(flipH ? W - x : x), f2(flipV ? H - y : y)
      );
      i += 8;
    } else if (t === "M" || t === "L" || t === "C" || t === "Z") {
      out.push(t);
      i += 1;
    } else {
      const x = Number(tokens[i]);
      const y = Number(tokens[i + 1]);
      out.push(f2(flipH ? W - x : x), f2(flipV ? H - y : y));
      i += 2;
    }
  }
  return out.join(" ");
}

function hexagon(prstGeom: any, W: number, H: number): string {
  const ss = Math.min(W, H);
  const maxAdj = (50000 * W) / ss;
  const a = Math.max(0, Math.min(maxAdj, readAdj(prstGeom, "adj", 25000)));
  const vf = readAdj(prstGeom, "vf", 115470);
  const x1 = (ss * a) / 100000;
  const x2 = W - x1;
  const shd2 = ((H / 2) * vf) / 100000;
  const dy1 = shd2 * Math.sin(Math.PI / 3);
  const y1 = H / 2 - dy1;
  const y2 = H / 2 + dy1;
  return polygon([[0, H / 2], [x1, y1], [x2, y1], [W, H / 2], [x2, y2], [x1, y2]]);
}

function lightningBolt(W: number, H: number): string {
  const pts: Pt[] = [
    [8472, 0], [12860, 6080], [11050, 6797], [16577, 12007], [14767, 12877],
    [21600, 21600], [10012, 14915], [12222, 13987], [5022, 9705], [7602, 8382],
    [0, 3890],
  ];
  return polygon(pts.map(([x, y]) => [(x * W) / 21600, (y * H) / 21600] as Pt));
}

function moon(prstGeom: any, W: number, H: number): string {
  const ss = Math.min(W, H);
  const a = Math.max(0, Math.min(87500, readAdj(prstGeom, "adj", 50000)));
  // Inner edge: a half-ellipse sharing the outer arc's endpoints, reaching as
  // far left as the crescent's thickest point.
  const thickness = (((ss * a) / 100000) * W) / ss;
  const innerRx = Math.max(0.01, W - thickness);
  return (
    `M ${f2(W)} 0 A ${f2(W)} ${f2(H / 2)} 0 0 0 ${f2(W)} ${f2(H)} ` +
    `A ${f2(innerRx)} ${f2(H / 2)} 0 0 1 ${f2(W)} 0 Z`
  );
}

function heart(W: number, H: number): string {
  const p = (x: number, y: number) => `${f2(x * W)} ${f2(y * H)}`;
  return (
    `M ${p(0.5, 0.28)} ` +
    `C ${p(0.5, 0.12)} ${p(0.38, 0)} ${p(0.25, 0)} ` +
    `C ${p(0.1, 0)} ${p(0, 0.12)} ${p(0, 0.32)} ` +
    `C ${p(0, 0.6)} ${p(0.4, 0.78)} ${p(0.5, 1)} ` +
    `C ${p(0.6, 0.78)} ${p(1, 0.6)} ${p(1, 0.32)} ` +
    `C ${p(1, 0.12)} ${p(0.9, 0)} ${p(0.75, 0)} ` +
    `C ${p(0.62, 0)} ${p(0.5, 0.12)} ${p(0.5, 0.28)} Z`
  );
}

/** A scalloped ellipse: eight outward-bulging arcs between points on an oval. */
function cloud(W: number, H: number): string {
  const n = 8;
  const cx = W / 2;
  const cy = H / 2;
  const rx = W * 0.44;
  const ry = H * 0.38;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n - Math.PI / 2;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  let d = `M ${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 1; i <= n; i++) {
    const [px, py] = pts[i - 1];
    const [qx, qy] = pts[i % n];
    const chord = Math.hypot(qx - px, qy - py);
    const r = chord * 0.62;
    d += ` A ${f2(r)} ${f2(r)} 0 0 1 ${f2(qx)} ${f2(qy)}`;
  }
  return d + " Z";
}

/**
 * wedgeRectCallout / wedgeRoundRectCallout: a (rounded) rectangle with a
 * triangular pointer to a tip at (`adj1`, `adj2`) — the tip's offset from the
 * centre as a fraction of width / height. The pointer leaves the edge the tip
 * lies beyond.
 */
function wedgeCallout(prstGeom: any, W: number, H: number, rounded: boolean): string {
  const adj1 = readAdj(prstGeom, "adj1", -20833);
  const adj2 = readAdj(prstGeom, "adj2", 62500);
  const ss = Math.min(W, H);
  const r = rounded
    ? (ss * Math.max(0, Math.min(50000, readAdj(prstGeom, "adj3", 16667)))) / 100000
    : 0;
  const dx = (W * adj1) / 100000;
  const dy = (H * adj2) / 100000;
  const tip: Pt = [W / 2 + dx, H / 2 + dy];
  const dz = Math.abs(dy) - Math.abs((dx * H) / W);
  const xa = dx > 0 ? (W * 7) / 12 : (W * 2) / 12;
  const xb = dx > 0 ? (W * 10) / 12 : (W * 5) / 12;
  const ya = dy > 0 ? (H * 7) / 12 : (H * 2) / 12;
  const yb = dy > 0 ? (H * 10) / 12 : (H * 5) / 12;
  const top = dz > 0 && dy < 0;
  const bottom = dz > 0 && dy >= 0;
  const left = dz <= 0 && dx < 0;
  const right = dz <= 0 && dx >= 0;
  const L = (p: Pt) => ` L ${f2(p[0])} ${f2(p[1])}`;
  const arc = (x: number, y: number) =>
    r > 0 ? ` A ${f2(r)} ${f2(r)} 0 0 1 ${f2(x)} ${f2(y)}` : L([x, y]);
  let d = `M ${f2(r)} 0`;
  if (top) d += L([xa, 0]) + L(tip) + L([xb, 0]);
  d += L([W - r, 0]) + arc(W, r);
  if (right) d += L([W, ya]) + L(tip) + L([W, yb]);
  d += L([W, H - r]) + arc(W - r, H);
  if (bottom) d += L([xb, H]) + L(tip) + L([xa, H]);
  d += L([r, H]) + arc(0, H - r);
  if (left) d += L([0, yb]) + L(tip) + L([0, ya]);
  d += L([0, r]) + arc(r, 0);
  return d + " Z";
}

/** Outline for `preset`, or undefined when it has no synthesised outline. */
export function buildPresetShapePath(
  preset: string | undefined,
  prstGeom: any,
  w: number,
  h: number,
  flipH: boolean,
  flipV: boolean
): ShapePath | undefined {
  const W = Math.max(1, w);
  const H = Math.max(1, h);
  let d: string;
  switch (preset) {
    case "hexagon":
      d = hexagon(prstGeom, W, H);
      break;
    case "lightningBolt":
      d = lightningBolt(W, H);
      break;
    case "moon":
      d = moon(prstGeom, W, H);
      break;
    case "heart":
      d = heart(W, H);
      break;
    case "cloud":
      d = cloud(W, H);
      break;
    case "wedgeRectCallout":
      d = wedgeCallout(prstGeom, W, H, false);
      break;
    case "wedgeRoundRectCallout":
      d = wedgeCallout(prstGeom, W, H, true);
      break;
    default:
      return undefined;
  }
  return { d: mirror(d, W, H, flipH, flipV), viewW: W, viewH: H };
}
