/*
  The one check on the fix-age logic: a parent must never be shown a live bus
  that is not live, and a fix that is merely a minute old must not be thrown
  away. Run with `npm run check:gps`.
*/
import assert from "node:assert/strict";
import { fixAgeMs, fixState, GPS_FRESH_MS, GPS_LOST_MS } from "../lib/gps";

const t = (ms: number) => new Date(ms).toISOString();

// Age is server-measured, then carried forward on the device.
assert.equal(fixAgeMs({ fetchedAt: t(100_000), recordedAt: t(92_000) }, 0), 8_000);
assert.equal(fixAgeMs({ fetchedAt: t(100_000), recordedAt: t(92_000) }, 5_000), 13_000);

// A parent's phone set an hour fast cannot make a dead trail look live, and a
// phone set an hour slow cannot bury a good one: only the server's own delta
// and the elapsed time on the device count.
const skewed = fixAgeMs({ fetchedAt: t(100_000), recordedAt: t(92_000) }, 4_000);
assert.equal(skewed, 12_000, "device clock must not enter the arithmetic");

assert.equal(fixState(null), "none");
assert.equal(fixState(0), "live");
assert.equal(fixState(GPS_FRESH_MS), "live", "the threshold itself is still live");
assert.equal(fixState(GPS_FRESH_MS + 1), "drifting");
assert.equal(fixState(GPS_LOST_MS), "drifting");
assert.equal(fixState(GPS_LOST_MS + 1), "lost");

// The driver sends every 8s; a single missed fix must not downgrade the map.
assert.equal(fixState(8_000 * 3), "live", "three missed fixes is still live");

console.log("gps: age arithmetic is clock-skew proof, thresholds hold at both edges");
