/*
  The route decider.

  Given where children live, how many buses there are and how big each one is,
  this works out the stops, which bus serves which, in what order, and at what
  time. No database, no network, no three.js — plain functions over plain
  numbers, so the thing a child's morning depends on can be asserted in a
  script (scripts/check-routing.ts) rather than eyeballed on a map.

  It is deliberately not a model. A model emits a plausible sequence and cannot
  tell you it has put 47 children on a 40-seat bus. Everything here either
  satisfies the stated limits or reports, by name, that it could not — which is
  the only behaviour a school can actually act on.

  ponytail: straight-line distance throughout. Real roads are 20-40% longer in
  an Indian city, so `speedKmh` is an effective speed that absorbs it and the
  times are a first draft to be corrected after someone drives the route. The
  upgrade is a road-distance matrix (OSRM /table) feeding the same functions,
  then OR-Tools once a school outgrows the sweep.
*/

export type Home = { id: string; name: string; lat: number; lng: number };
export type Bus = { id: string; plate: string; capacity: number };

export type PlannedStop = {
  /** Stable within one plan; real ids are assigned when it is committed. */
  key: string;
  name: string;
  lat: number;
  lng: number;
  studentIds: string[];
  /** Minutes before the bell this stop is served. */
  scheduledTime: string;
};

export type PlannedRoute = {
  busId: string;
  plate: string;
  name: string;
  stops: PlannedStop[];
  students: number;
  /** Kilometres, straight-line, depot included. */
  km: number;
  /** Minutes the first child picked up spends on board. */
  longestRideMin: number;
};

export type Plan = {
  routes: PlannedRoute[];
  /** Children the plan could not place, and why — never silently dropped. */
  unplaced: { id: string; name: string; reason: string }[];
  /** Stops that no bus had room for, if capacity ran out. */
  unserved: { name: string; students: number }[];
};

export type PlanInput = {
  homes: Home[];
  buses: Bus[];
  school: { lat: number; lng: number };
  /** How far a child may walk to a stop, in metres. */
  walkRadiusM: number;
  /** When every bus must be at school, "HH:MM". */
  bellTime: string;
  /** Effective door-to-door speed including traffic and road factor. */
  speedKmh: number;
  /** Seconds the bus is stationary at each stop. */
  dwellSec: number;
  /** No child may be on board longer than this. */
  maxRideMin: number;
  /** Names stops after the nearest of these, when any are given. */
  landmarks?: { name: string; lat: number; lng: number }[];
};

/* ------------------------------------------------------------------ geometry */

const R_EARTH = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compass bearing from a to b, in radians from north. Used to sweep. */
function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
}

/* ------------------------------------------------------- homes into stops */

export type Cluster = { lat: number; lng: number; studentIds: string[]; names: string[] };

/**
 * Children within a short walk of each other share a stop.
 *
 * Greedy, by design: take the home with the most neighbours inside the walk
 * radius, make that a stop, remove everyone it serves, repeat. k-means would
 * give rounder clusters and no guarantee about walking distance, which is the
 * one thing a parent actually experiences.
 */
export function clusterHomes(homes: Home[], walkRadiusM: number): Cluster[] {
  const radiusKm = walkRadiusM / 1000;
  const left = new Map(homes.map((h) => [h.id, h]));
  const out: Cluster[] = [];

  while (left.size > 0) {
    const rest = [...left.values()];
    let best = rest[0];
    let bestNear: Home[] = [];
    for (const h of rest) {
      const near = rest.filter((o) => haversineKm(h, o) <= radiusKm);
      // Ties break on id so the same input always yields the same stops.
      if (near.length > bestNear.length || (near.length === bestNear.length && h.id < best.id)) {
        best = h;
        bestNear = near;
      }
    }
    /*
      The stop wants to sit at the centre of the children it serves rather than
      on one of their doorsteps — but everyone here was chosen for being within
      the walk radius of the *seed*, and the centroid can be further from an
      outlying member than that. Two homes on opposite edges are 2r apart, so
      the centroid can put one of them r away from their own stop, breaking the
      only promise a stop makes to a parent.

      So the stop slides from the seed toward the centroid as far as it can
      without anyone's walk growing past the radius. Usually that is all the
      way; when it is not, it stops where the constraint binds.
    */
    const cLat = bestNear.reduce((n, h) => n + h.lat, 0) / bestNear.length;
    const cLng = bestNear.reduce((n, h) => n + h.lng, 0) / bestNear.length;
    const fits = (t: number) => {
      const p = { lat: best.lat + (cLat - best.lat) * t, lng: best.lng + (cLng - best.lng) * t };
      return bestNear.every((h) => haversineKm(h, p) <= radiusKm) ? p : null;
    };
    let point = fits(1) ?? { lat: best.lat, lng: best.lng };
    if (!fits(1)) {
      let lo = 0, hi = 1;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        const p = fits(mid);
        if (p) { point = p; lo = mid; } else hi = mid;
      }
    }
    out.push({ ...point, studentIds: bestNear.map((h) => h.id), names: bestNear.map((h) => h.name) });
    for (const h of bestNear) left.delete(h.id);
  }
  return out;
}

/** Names a stop after the nearest landmark, or falls back to a number. */
export function nameStops(
  clusters: Cluster[],
  landmarks: { name: string; lat: number; lng: number }[] | undefined
): string[] {
  const used = new Map<string, number>();
  return clusters.map((c, i) => {
    if (!landmarks?.length) return `Stop ${i + 1}`;
    let best = landmarks[0];
    let bestKm = Infinity;
    for (const l of landmarks) {
      const km = haversineKm(c, l);
      if (km < bestKm) { bestKm = km; best = l; }
    }
    const n = (used.get(best.name) ?? 0) + 1;
    used.set(best.name, n);
    return n === 1 ? best.name : `${best.name} ${n}`;
  });
}

/* ------------------------------------------------------- stops onto buses */

type Load = { stop: Cluster; name: string; count: number };

/**
 * Sweep: order stops by their bearing from the school and hand consecutive
 * runs of them to each bus. Stops near each other in angle are near each other
 * on the ground, which is why this beats any arbitrary split and is the
 * classic answer before a real solver earns its keep.
 *
 * `useCount` is how many buses to spread across, and it matters more than it
 * looks. Filling one bus to its last seat before touching the next is legal
 * and awful: it produces one long route and leaves buses in the yard, so the
 * first child boards an hour before the bell for no reason. The caller raises
 * this number until the ride times come down.
 *
 * Buses are taken largest-first so a small one is never the reason a stop goes
 * unserved while a big one sits half empty.
 */
export function assignBuses(
  loads: Load[],
  buses: Bus[],
  school: { lat: number; lng: number },
  useCount = buses.length
): { bus: Bus; loads: Load[] }[] {
  const swept = [...loads].sort((a, b) => bearing(school, a.stop) - bearing(school, b.stop));
  const fleet = [...buses]
    .sort((a, b) => b.capacity - a.capacity || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(useCount, buses.length)));

  const out: { bus: Bus; loads: Load[] }[] = fleet.map((bus) => ({ bus, loads: [] }));
  const total = loads.reduce((n, l) => n + l.count, 0);
  // An even share, so the sweep hands each bus a comparable wedge of the town
  // rather than one bus the whole of it.
  const share = Math.ceil(total / out.length);

  let i = 0;
  for (const load of swept) {
    // A stop is never split across two buses: a parent cannot be told their
    // child is on whichever of two buses reached the kerb first.
    const used = (k: number) => out[k].loads.reduce((n, l) => n + l.count, 0);

    // Move on once this bus has had its share, as long as somewhere is left.
    while (i < out.length - 1 && used(i) >= Math.min(share, out[i].bus.capacity)) i++;

    let placed = false;
    for (let k = 0; k < out.length && !placed; k++) {
      const idx = (i + k) % out.length;
      if (used(idx) + load.count <= out[idx].bus.capacity) {
        out[idx].loads.push(load);
        i = idx;
        placed = true;
      }
    }
    if (!placed) out.push({ bus: { id: "", plate: "", capacity: 0 }, loads: [load] });
  }
  return out.filter((r) => r.loads.length > 0 || r.bus.id);
}

/* ------------------------------------------------------------- the order */

/** Nearest neighbour from the stop furthest out, working back to the school. */
function nearestNeighbour(stops: Cluster[], school: { lat: number; lng: number }): Cluster[] {
  if (stops.length <= 1) return [...stops];
  const left = [...stops];
  let current = left.reduce((far, s) => (haversineKm(school, s) > haversineKm(school, far) ? s : far), left[0]);
  const order = [current];
  left.splice(left.indexOf(current), 1);
  while (left.length) {
    let best = left[0];
    for (const s of left) if (haversineKm(current, s) < haversineKm(current, best)) best = s;
    order.push(best);
    left.splice(left.indexOf(best), 1);
    current = best;
  }
  return order;
}

/** Total kilometres of a run: first stop, through the rest, then the school. */
export function routeKm(order: Cluster[], school: { lat: number; lng: number }): number {
  let km = 0;
  for (let i = 1; i < order.length; i++) km += haversineKm(order[i - 1], order[i]);
  return km + (order.length ? haversineKm(order[order.length - 1], school) : 0);
}

/**
 * 2-opt: reverse any stretch that makes the run shorter, until none does.
 * Cheap, and it removes the crossings nearest-neighbour always leaves behind.
 * It can only ever shorten the route, which the check asserts.
 */
export function twoOpt(order: Cluster[], school: { lat: number; lng: number }): Cluster[] {
  if (order.length < 4) return [...order];
  let best = [...order];
  let bestKm = routeKm(best, school);
  for (let pass = 0; pass < 40; pass++) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const next = [...best.slice(0, i + 1), ...best.slice(i + 1, j + 1).reverse(), ...best.slice(j + 1)];
        const km = routeKm(next, school);
        if (km < bestKm - 1e-9) { best = next; bestKm = km; improved = true; }
      }
    }
    if (!improved) break;
  }
  return best;
}

/* ------------------------------------------------------------------ times */

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const toClock = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * Times are counted backwards from the bell, because the bell is the only
 * fixed point in a school morning. Everything else moves to meet it.
 */
export function scheduleBackFromBell(
  order: Cluster[],
  school: { lat: number; lng: number },
  opts: { bellTime: string; speedKmh: number; dwellSec: number }
): string[] {
  const bell = toMinutes(opts.bellTime);
  const dwell = opts.dwellSec / 60;
  const legMin = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    (haversineKm(a, b) / opts.speedKmh) * 60;

  // Walk the run in reverse: the last stop is one leg before the bell, each
  // earlier stop is a leg plus its own dwell before the one after it.
  const times = new Array<number>(order.length);
  for (let i = order.length - 1; i >= 0; i--) {
    const after = i === order.length - 1 ? school : order[i + 1];
    const arriveAfter = i === order.length - 1 ? bell : times[i + 1];
    times[i] = arriveAfter - legMin(order[i], after) - (i === order.length - 1 ? 0 : dwell);
  }
  return times.map(toClock);
}

/* -------------------------------------------------------------- the plan */

export function planRoutes(input: PlanInput): Plan {
  const { homes, buses, school } = input;

  const unplaced: Plan["unplaced"] = [];
  const usable = homes.filter((h) => {
    const ok = Number.isFinite(h.lat) && Number.isFinite(h.lng) && !(h.lat === 0 && h.lng === 0);
    if (!ok) unplaced.push({ id: h.id, name: h.name, reason: "No home location on file" });
    return ok;
  });

  if (!usable.length || !buses.length) {
    return { routes: [], unplaced, unserved: [] };
  }

  const clusters = clusterHomes(usable, input.walkRadiusM);
  const names = nameStops(clusters, input.landmarks);
  const loads: Load[] = clusters.map((stop, i) => ({ stop, name: names[i], count: stop.studentIds.length }));

  // A stop holding more children than the biggest bus can never be served, and
  // saying so by name beats quietly dropping it into a route that overflows.
  const biggest = Math.max(...buses.map((b) => b.capacity));
  const unserved: Plan["unserved"] = [];
  const servable = loads.filter((l) => {
    if (l.count > biggest) {
      unserved.push({ name: l.name, students: l.count });
      for (const id of l.stop.studentIds) {
        const h = usable.find((u) => u.id === id)!;
        unplaced.push({ id, name: h.name, reason: `${l.name} has ${l.count} children; the largest bus seats ${biggest}` });
      }
      return false;
    }
    return true;
  });

  /*
    How many buses to actually use.

    Capacity sets the floor — you cannot seat 90 children in two 40-seat buses.
    The ride ceiling sets everything above it: a fleet that could legally do
    the job with one bus will still put the first child on board for an hour,
    and the fix for that is another bus, not another algorithm.

    So the plan is built at the smallest fleet that seats everyone, and buses
    are added one at a time until no child rides longer than the school allows
    or the yard is empty. The best attempt is kept either way, because a draft
    that breaches the ceiling and says so beats no draft at all.
  */
  const seats = [...buses].sort((a, b) => b.capacity - a.capacity).map((b) => b.capacity);
  const needed = (() => {
    const total = servable.reduce((n, l) => n + l.count, 0);
    let got = 0;
    for (let i = 0; i < seats.length; i++) {
      got += seats[i];
      if (got >= total) return i + 1;
    }
    return seats.length;
  })();

  let best: { routes: PlannedRoute[]; unserved: Plan["unserved"]; worst: number } | null = null;

  for (let useCount = needed; useCount <= buses.length; useCount++) {
    const attempt = buildRoutes(servable, buses, school, input, useCount);
    const worst = attempt.routes.length ? Math.max(...attempt.routes.map((r) => r.longestRideMin)) : 0;

    // Fewer unserved children always wins; after that, the shorter longest ride.
    const better =
      !best ||
      attempt.unserved.length < best.unserved.length ||
      (attempt.unserved.length === best.unserved.length && worst < best.worst);
    if (better) best = { ...attempt, worst };

    if (!attempt.unserved.length && worst <= input.maxRideMin) break;
  }

  const routes = best?.routes ?? [];
  for (const u of best?.unserved ?? []) unserved.push(u);
  // Children on a stop no bus could take are named individually, not counted.
  for (const u of best?.unserved ?? []) {
    const load = servable.find((l) => l.name === u.name);
    for (const id of load?.stop.studentIds ?? []) {
      const h = usable.find((x) => x.id === id);
      if (h && !unplaced.some((p) => p.id === id)) {
        unplaced.push({ id, name: h.name, reason: "No bus had room — add a bus or raise a capacity" });
      }
    }
  }

  routes.sort((a, b) => a.name.localeCompare(b.name));
  return { routes, unplaced, unserved };
}

/** One attempt at a plan with a given number of buses. */
function buildRoutes(
  servable: Load[],
  buses: Bus[],
  school: { lat: number; lng: number },
  input: PlanInput,
  useCount: number
): { routes: PlannedRoute[]; unserved: Plan["unserved"] } {
  const assigned = assignBuses(servable, buses, school, useCount);
  const routes: PlannedRoute[] = [];
  const unserved: Plan["unserved"] = [];

  for (const { bus, loads: mine } of assigned) {
    if (!mine.length) continue;
    if (!bus.id) {
      for (const l of mine) unserved.push({ name: l.name, students: l.count });
      continue;
    }

    const byKey = new Map(mine.map((l) => [l.stop, l]));
    const order = twoOpt(nearestNeighbour(mine.map((l) => l.stop), school), school);
    const times = scheduleBackFromBell(order, school, input);

    const stops: PlannedStop[] = order.map((c, i) => ({
      key: `${bus.id}:${i}`,
      name: byKey.get(c)!.name,
      lat: c.lat,
      lng: c.lng,
      studentIds: c.studentIds,
      scheduledTime: times[i],
    }));

    // The first child on is the one who rides longest, so that is the figure a
    // parent would ask about and the one a plan is judged on.
    const longestRideMin = stops.length
      ? toMinutes(input.bellTime) - toMinutes(stops[0].scheduledTime)
      : 0;

    routes.push({
      busId: bus.id,
      plate: bus.plate,
      name: stops.length ? `${stops[0].name} — ${bus.plate}` : bus.plate,
      stops,
      students: stops.reduce((n, s) => n + s.studentIds.length, 0),
      km: routeKm(order, school),
      longestRideMin,
    });
  }

  return { routes, unserved };
}

/** Routes whose first child is on board longer than the school allows. */
export function overLongRoutes(plan: Plan, maxRideMin: number): PlannedRoute[] {
  return plan.routes.filter((r) => r.longestRideMin > maxRideMin);
}
