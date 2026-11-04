/*
  The route planner decides where a child stands at seven in the morning and
  how long they sit on a bus. None of that is visible in a screenshot, so it is
  asserted here.

    npm run check:routing
*/
import assert from "node:assert";
import {
  planRoutes, clusterHomes, twoOpt, routeKm, haversineKm,
  scheduleBackFromBell, toMinutes, overLongRoutes,
  type Home, type Bus, type Cluster,
} from "../lib/routing";

/* A repeatable scatter of homes around a school, in Rohtak-ish coordinates. */
const SCHOOL = { lat: 28.8955, lng: 76.6066 };
function homes(n: number, seed = 11): Home[] {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Clumped, the way a town is: a handful of colonies, not an even spray.
  const colonies = Array.from({ length: 7 }, () => ({
    lat: SCHOOL.lat + (r() - 0.5) * 0.09,
    lng: SCHOOL.lng + (r() - 0.5) * 0.09,
  }));
  return Array.from({ length: n }, (_, i) => {
    const c = colonies[Math.floor(r() * colonies.length)];
    return {
      id: `s${i}`,
      name: `Child ${i}`,
      lat: c.lat + (r() - 0.5) * 0.006,
      lng: c.lng + (r() - 0.5) * 0.006,
    };
  });
}

const buses = (specs: number[]): Bus[] =>
  specs.map((capacity, i) => ({ id: `b${i}`, plate: `HR-12-${1000 + i}`, capacity }));

const BASE = {
  school: SCHOOL, walkRadiusM: 350, bellTime: "08:00",
  speedKmh: 18, dwellSec: 45, maxRideMin: 45,
};

/* ------------------------------------------------------------- clustering */
{
  const h = homes(200);
  const clusters = clusterHomes(h, 350);
  const seen = new Set<string>();
  for (const c of clusters) for (const id of c.studentIds) {
    assert.ok(!seen.has(id), `${id} is in two stops`);
    seen.add(id);
  }
  assert.equal(seen.size, h.length, "every child is in exactly one stop");

  // The promise a stop makes is the walk. It has to hold for every child in it.
  for (const c of clusters) {
    for (const id of c.studentIds) {
      const home = h.find((x) => x.id === id)!;
      assert.ok(haversineKm(home, c) <= 0.35 + 1e-6, `${id} walks further than the radius allows`);
    }
  }
  assert.ok(clusters.length < h.length, "clustering actually merges homes");

  // Same input, same stops — a planner that reshuffled on reload is unusable.
  assert.equal(JSON.stringify(clusterHomes(h, 350)), JSON.stringify(clusters), "clustering is deterministic");
}

/* ----------------------------------------------------------------- 2-opt */
{
  const pts: Cluster[] = homes(12, 3).map((h) => ({ lat: h.lat, lng: h.lng, studentIds: [h.id], names: [h.name] }));
  const before = routeKm(pts, SCHOOL);
  const after = routeKm(twoOpt(pts, SCHOOL), SCHOOL);
  assert.ok(after <= before + 1e-9, "2-opt must never lengthen a route");
  assert.equal(twoOpt(pts, SCHOOL).length, pts.length, "2-opt keeps every stop");
}

/* ------------------------------------------------------------------ times */
{
  const order: Cluster[] = [
    { lat: 28.93, lng: 76.57, studentIds: ["a"], names: ["a"] },
    { lat: 28.92, lng: 76.59, studentIds: ["b"], names: ["b"] },
    { lat: 28.91, lng: 76.60, studentIds: ["c"], names: ["c"] },
  ];
  const times = scheduleBackFromBell(order, SCHOOL, BASE);
  assert.equal(times.length, order.length);
  for (let i = 1; i < times.length; i++) {
    assert.ok(toMinutes(times[i]) > toMinutes(times[i - 1]), "stop times run forwards");
  }
  assert.ok(toMinutes(times.at(-1)!) < toMinutes(BASE.bellTime), "the last stop is before the bell");
  // Slower buses must leave earlier, not later.
  const slow = scheduleBackFromBell(order, SCHOOL, { ...BASE, speedKmh: 9 });
  assert.ok(toMinutes(slow[0]) < toMinutes(times[0]), "halving the speed starts the run earlier");
}

/* ------------------------------------------------------- the whole plan */
{
  const h = homes(240);
  const plan = planRoutes({ ...BASE, homes: h, buses: buses([45, 45, 40, 40, 35, 35, 30]) });

  const placed = plan.routes.flatMap((r) => r.stops.flatMap((s) => s.studentIds));
  const accounted = new Set([...placed, ...plan.unplaced.map((u) => u.id)]);
  assert.equal(accounted.size, h.length, "every child is either on a bus or named as unplaced");
  assert.equal(new Set(placed).size, placed.length, "no child is on two buses");

  for (const r of plan.routes) {
    const bus = buses([45, 45, 40, 40, 35, 35, 30]).find((b) => b.id === r.busId)!;
    assert.ok(r.students <= bus.capacity, `${r.plate} carries ${r.students} in ${bus.capacity} seats`);
    assert.ok(r.students > 0, "no empty route is published");
    assert.ok(r.km > 0, "a route has length");
    for (let i = 1; i < r.stops.length; i++) {
      assert.ok(
        toMinutes(r.stops[i].scheduledTime) > toMinutes(r.stops[i - 1].scheduledTime),
        `${r.plate} stop times run forwards`
      );
    }
  }

  // Whatever the ride ceiling costs, it must be reported rather than buried.
  const over = overLongRoutes(plan, BASE.maxRideMin);
  for (const r of over) assert.ok(r.longestRideMin > BASE.maxRideMin, "overLongRoutes only reports real breaches");

  console.log(
    `  ${h.length} children -> ${plan.routes.length} routes, ` +
      `${plan.routes.reduce((n, r) => n + r.stops.length, 0)} stops, ` +
      `longest ride ${Math.max(...plan.routes.map((r) => r.longestRideMin))} min, ` +
      `${over.length} over the ${BASE.maxRideMin} min ceiling`
  );
}

/* ----------------------------------- the ceiling must change the plan */
{
  /*
    The flaw this exists to stop: a sweep that fills one bus to its last seat
    before touching the next will happily put a whole school on one vehicle and
    leave the rest in the yard. It is legal — nobody is standing — and it is a
    bad plan, because the first child then boards an hour before the bell.
  */
  const h = homes(32, 5);
  const fleet = buses([40, 32, 24]);

  const generous = planRoutes({ ...BASE, maxRideMin: 180, homes: h, buses: fleet });
  assert.equal(generous.routes.length, 1, "with no real ceiling, one bus is the efficient answer");

  const strict = planRoutes({ ...BASE, maxRideMin: 20, homes: h, buses: fleet });
  assert.ok(strict.routes.length > 1, "a tight ceiling must put buses on the road, not just warn");
  assert.ok(
    Math.max(...strict.routes.map((r) => r.longestRideMin)) <
      Math.max(...generous.routes.map((r) => r.longestRideMin)),
    "spreading across buses must actually shorten the longest ride"
  );
  for (const r of strict.routes) assert.ok(r.students > 0, "no bus is sent out empty");

  const placed = strict.routes.flatMap((r) => r.stops.flatMap((s) => s.studentIds));
  assert.equal(new Set(placed).size, placed.length, "splitting across buses never duplicates a child");
  assert.equal(
    placed.length + strict.unplaced.length,
    h.length,
    "and never loses one"
  );

  console.log(
    `  ceiling 180 min -> ${generous.routes.length} bus, ` +
      `${Math.max(...generous.routes.map((r) => r.longestRideMin))} min; ` +
      `ceiling 20 min -> ${strict.routes.length} buses, ` +
      `${Math.max(...strict.routes.map((r) => r.longestRideMin))} min`
  );
}

/* --------------------------------------------- when it cannot be done */
{
  // Not enough seats in the whole fleet: it must say so, by name.
  const h = homes(120);
  const plan = planRoutes({ ...BASE, homes: h, buses: buses([30]) });
  assert.ok(plan.unplaced.length > 0, "a fleet that is too small reports unplaced children");
  const seated = plan.routes.reduce((n, r) => n + r.students, 0);
  assert.ok(seated <= 30, "it never overfills the one bus it has");
  assert.equal(seated + plan.unplaced.length, h.length, "unplaced plus seated accounts for everyone");

  // A child with no coordinates is a review item, not a crash.
  const broken: Home[] = [
    ...homes(20),
    { id: "x1", name: "No Address", lat: NaN, lng: NaN },
    { id: "x2", name: "Null Island", lat: 0, lng: 0 },
  ];
  const p2 = planRoutes({ ...BASE, homes: broken, buses: buses([40]) });
  const reasons = p2.unplaced.filter((u) => u.id.startsWith("x"));
  assert.equal(reasons.length, 2, "both unlocatable children are reported");
  for (const r of reasons) assert.match(r.reason, /No home location/, "and told why");

  // No buses at all is an empty plan, not an exception.
  const p3 = planRoutes({ ...BASE, homes: homes(10), buses: [] });
  assert.equal(p3.routes.length, 0, "no buses means no routes");
}

/* ------------------------------------------------- stops get real names */
{
  const h = homes(60);
  const plan = planRoutes({
    ...BASE, homes: h, buses: buses([40, 40]),
    landmarks: [
      { name: "Model Town", lat: 28.9, lng: 76.58 },
      { name: "Shivaji Colony", lat: 28.93, lng: 76.63 },
    ],
  });
  const names = plan.routes.flatMap((r) => r.stops.map((s) => s.name));
  assert.ok(names.some((n) => n.startsWith("Model Town") || n.startsWith("Shivaji Colony")),
    "stops take the nearest landmark's name");
  assert.equal(new Set(names).size, names.length, "no two stops share a name");
}

console.log("routing: capacity, walking distance, ride times and the order all hold");
