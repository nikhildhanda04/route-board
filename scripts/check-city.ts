/*
  The city is seeded and the buses run on streets. Both are easy to break and
  neither is visible in a screenshot, so they are asserted here.

    npm run check:city
*/
import assert from "node:assert";
import { strokes, buildings, ROUTES, STOPS, SCHOOL, at, line, GRID, HALF, PITCH } from "../components/route-city/city";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Seeded: two calls, and two different seeds, behave as advertised.
assert.ok(same(strokes(7), strokes(7)), "same seed must redraw the same city");
assert.ok(!same(strokes(7), strokes(8)), "a different seed must be a different city");
assert.ok(same(buildings(7), buildings(7)), "buildings must be seeded too");

// Nothing may stand outside the grid, or a stroke lands in open space.
for (const b of buildings(7)) {
  assert.ok(Math.abs(b.x) <= HALF && Math.abs(b.z) <= HALF, "building inside the grid");
  assert.ok(b.h > 0, "building has height");
}

// A bus only ever travels along a street: every leg is axis-aligned, and every
// point sits on a grid line. An L-turn through open ground would be a lie.
for (const route of ROUTES) {
  assert.ok(route.path.length >= 2, "route has a path");
  for (const [x, y, z] of route.path) {
    assert.equal(y, 0, "route stays on the ground");
    const onX = Math.abs(Math.round((x + HALF) / PITCH) * PITCH - HALF - x) < 1e-9;
    const onZ = Math.abs(Math.round((z + HALF) / PITCH) * PITCH - HALF - z) < 1e-9;
    assert.ok(onX && onZ, `route point ${x},${z} must sit on a street corner`);
  }
  for (let i = 1; i < route.path.length; i++) {
    const [ax, , az] = route.path[i - 1];
    const [bx, , bz] = route.path[i];
    assert.ok(ax === bx || az === bz, "every leg runs along one street");
    assert.ok(ax !== bx || az !== bz, "no zero-length leg");
  }
  // No leg may undo the one before it: a bus that leaves a stop and drives
  // back down the street it just finished is collecting nobody.
  for (let i = 2; i < route.path.length; i++) {
    const [ax, , az] = route.path[i - 2];
    const [bx, , bz] = route.path[i - 1];
    const [cx, , cz] = route.path[i];
    const d1 = [Math.sign(bx - ax), Math.sign(bz - az)];
    const d2 = [Math.sign(cx - bx), Math.sign(cz - bz)];
    assert.ok(
      !(d1[0] === -d2[0] && d1[1] === -d2[1]),
      `leg ${i} doubles back on itself`
    );
  }

  // It must actually call at its own stops and finish at the school.
  for (const s of route.stops) {
    assert.ok(route.path.some((p) => same(p, at(STOPS[s].ij))), `route calls at ${STOPS[s].name}`);
  }
  assert.ok(same(route.path.at(-1), at(SCHOOL.ij)), "every route ends at the school");
}

// Every stop and the school sit on an intersection inside the grid.
for (const s of [...STOPS, SCHOOL]) {
  const [i, j] = s.ij;
  assert.ok(i >= 0 && i <= GRID && j >= 0 && j <= GRID, `${s.name} is on the grid`);
  assert.ok(same(at(s.ij), [line(i), 0, line(j)]), `${s.name} sits on the corner`);
}

// Between them the two buses carry every stop, exactly once.
const carried = ROUTES.flatMap((r) => r.stops).sort();
assert.ok(same(carried, STOPS.map((_, i) => i)), "every stop is on exactly one bus");

console.log(
  `city: ${buildings(7).length} buildings, ${strokes(7).length} strokes, ` +
    `${ROUTES.length} routes on streets, ${STOPS.length} stops each served once`
);
