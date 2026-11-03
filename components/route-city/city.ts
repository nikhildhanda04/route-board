/*
  The city RouteCity draws, as plain data: no three.js here, so the shape of
  the place can be checked without a browser (scripts/check-city.ts).

  Everything is seeded. A landing page that rearranged its own city between a
  screenshot and a sales call would be a liability, and a drawing that is
  different every reload is a toy rather than a diagram.

  Units are metres-ish and mean nothing in particular; the grid is what matters.
  Ground plane is XZ, up is Y, which is what three.js expects.
*/

export type P3 = [number, number, number];
/** One pen stroke: a polyline, when it starts drawing, and what colour it is. */
export type Stroke = { pts: P3[]; start: number; color: "ink" | "blue" | "bus" | "faint" };

export const GRID = 6;          // blocks per side
export const PITCH = 16;        // street-to-street
export const BLOCK = 12;        // buildable square inside a block
export const HALF = (GRID * PITCH) / 2;

/** Street coordinate of grid index i, for i in 0..GRID. */
export const line = (i: number) => -HALF + i * PITCH;

/** mulberry32 — small, seeded, and good enough for building heights. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- the places */

/** Grid intersections, as [i, j] into the street lines. */
export const STOPS = [
  { ij: [1, 1] as const, name: "Kothrud Depot", time: "07:05", children: 11 },
  { ij: [4, 1] as const, name: "Sai Residency", time: "07:12", children: 9 },
  { ij: [1, 4] as const, name: "Karve Nagar", time: "07:09", children: 12 },
  { ij: [5, 4] as const, name: "Nal Stop", time: "07:17", children: 8 },
];
export const SCHOOL = { ij: [3, 6] as const, name: "School", time: "07:35" };

export const at = (ij: readonly [number, number]): P3 => [line(ij[0]), 0, line(ij[1])];

/**
 * A bus goes along streets, never across a block, so a leg between two
 * intersections is the L through one of their two shared corners.
 *
 * Which corner is not cosmetic. Take the wrong one and the bus leaves a stop,
 * turns, and drives back down the street it has just finished — past children
 * it has already collected, for nothing. So a leg turns onto the axis the
 * previous leg was *not* travelling along, which is the shortest rule that
 * cannot double back.
 */
function leg(
  a: readonly [number, number],
  b: readonly [number, number],
  turnJFirst: boolean
): P3[] {
  // Collinear legs would otherwise carry a redundant middle point.
  if (a[0] === b[0] || a[1] === b[1]) return [at(a), at(b)];
  const corner: readonly [number, number] = turnJFirst ? [a[0], b[1]] : [b[0], a[1]];
  return [at(a), at(corner), at(b)];
}

export function routePath(stops: readonly (readonly [number, number])[]): P3[] {
  const out: P3[] = [];
  // Which axis the pen is travelling on as it arrives at the next stop.
  let alongI = false;
  for (let i = 0; i < stops.length - 1; i++) {
    const l = leg(stops[i], stops[i + 1], alongI);
    out.push(...(i === 0 ? l : l.slice(1)));
    const [px, , pz] = l[l.length - 2];
    const [qx, , qz] = l[l.length - 1];
    alongI = px !== qx && pz === qz;
  }
  return out;
}

/** Bus A takes the northern pair, bus B the southern. Both end at the school. */
export const ROUTES = [
  { color: "bus" as const, path: routePath([STOPS[0].ij, STOPS[1].ij, SCHOOL.ij]), stops: [0, 1] },
  { color: "blue" as const, path: routePath([STOPS[2].ij, STOPS[3].ij, SCHOOL.ij]), stops: [2, 3] },
];

/* ---------------------------------------------------------------- the drawing */

/** Distance from the middle of the city, normalised — the pen works outward. */
const spread = (x: number, z: number) => Math.hypot(x, z) / (HALF * Math.SQRT2);

export type Building = { x: number; z: number; w: number; d: number; h: number; sketch: boolean };

export function buildings(seed = 7): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  for (let bx = 0; bx < GRID; bx++) {
    for (let bz = 0; bz < GRID; bz++) {
      // The block a stop or the school sits on stays open, so the pin is not
      // buried behind a tower.
      const near = [...STOPS.map((s) => s.ij), SCHOOL.ij].some(
        ([i, j]) => (i === bx || i === bx + 1) && (j === bz || j === bz + 1)
      );
      const ox = line(bx) + (PITCH - BLOCK) / 2;
      const oz = line(bz) + (PITCH - BLOCK) / 2;
      const lots = near ? 1 : 4;
      for (let k = 0; k < lots; k++) {
        if (r() < (near ? 0.5 : 0.12)) continue;          // a few empty lots
        const half = BLOCK / 2;
        const lx = ox + (lots === 1 ? half - 2.5 : (k % 2) * half + 0.6);
        const lz = oz + (lots === 1 ? half - 2.5 : Math.floor(k / 2) * half + 0.6);
        const w = (lots === 1 ? 5 : 4.2) + r() * 0.8;
        const d = (lots === 1 ? 5 : 4.2) + r() * 0.8;
        const center = 1 - spread(lx, lz);
        const h = 2 + r() * 4 + center * center * 8;      // downtown in the middle
        out.push({ x: lx + w / 2, z: lz + d / 2, w, d, h, sketch: r() < 0.3 });
      }
    }
  }
  return out;
}

/* Pen timings, in seconds from the moment the city comes into view. */
export const T = {
  streets: 0.0,
  streetSpread: 0.55,
  buildings: 0.7,
  buildingSpread: 2.0,
  pins: 3.1,
  routes: 3.6,
  routeDraw: 1.5,
  bus: 5.3,
  busLap: 9.0,
  stroke: 0.42,       // how long one stroke takes once it starts
};

/** Every line of the city, in draw order. Buildings are boxes; hidden edges
    are hidden by the paper solids the renderer puts inside them. */
export function strokes(seed = 7): Stroke[] {
  const r = rng(seed * 31 + 1);
  const out: Stroke[] = [];
  const over = 0.3;                                   // pens overshoot corners

  for (let i = 0; i <= GRID; i++) {
    const c = line(i);
    const t = (k: number) => T.streets + k * T.streetSpread;
    const d = Math.abs(i - GRID / 2) / (GRID / 2);
    out.push({ pts: [[-HALF - over, 0, c], [HALF + over, 0, c]], start: t(d), color: "faint" });
    out.push({ pts: [[c, 0, -HALF - over], [c, 0, HALF + over]], start: t(d), color: "faint" });
  }

  for (const b of buildings(seed)) {
    const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
    const start = T.buildings + spread(b.x, b.z) * T.buildingSpread;
    const box: P3[][] = [
      [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, 0, z0]],
      [[x0, b.h, z0], [x1, b.h, z0], [x1, b.h, z1], [x0, b.h, z1], [x0, b.h, z0]],
      [[x0, 0, z0], [x0, b.h, z0]], [[x1, 0, z0], [x1, b.h, z0]],
      [[x1, 0, z1], [x1, b.h, z1]], [[x0, 0, z1], [x0, b.h, z1]],
    ];
    for (const pts of box) {
      out.push({ pts, start, color: "ink" });
      // An architect goes over some edges twice, a shade off the first pass.
      if (b.sketch && r() < 0.45) {
        const j = 0.14;
        out.push({
          pts: pts.map(([x, y, z]) => [x + (r() - 0.5) * j, y + (r() - 0.5) * j, z + (r() - 0.5) * j] as P3),
          start: start + 0.12,
          color: "ink",
        });
      }
    }
  }

  return out;
}
