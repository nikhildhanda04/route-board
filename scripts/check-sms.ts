/**
 * The one thing that must not silently regress: a notification spilling past
 * 160 characters doubles its cost, and messaging is ~100% of unit cost.
 * Run: npx tsx scripts/check-sms.ts
 */
import assert from "node:assert/strict";
import { renderTemplate } from "../lib/templates";

// A tracking ref is schoolId+tripEventId, each uuid packed to base64url: 44
// chars. (tracking-token is server-only, so the shape is restated here.)
const link = `https://routeboard.app/t/${"a".repeat(44)}`;
assert.equal(link.length, 69);
const NAME = "Lakshmi Priya Venkataraman"; // long on purpose
const STOP = "Jayanagar 4th Block Bus Stand";

const cases: [string, string[]][] = [
  ["child_boarded", [NAME, "KA-01-AB-5521", "07:42", link]],
  ["reached_school", [NAME, "08:15"]],
  ["left_school", [NAME, "15:05", link]],
  ["reached_stop", [NAME, STOP, "15:48"]],
  ["not_boarded", [NAME, STOP]],
];

for (const [template, params] of cases) {
  const body = renderTemplate(template, params);
  assert.ok(!body.includes("{{"), `${template}: unfilled placeholder in "${body}"`);
  assert.ok(body.length <= 160, `${template}: ${body.length} chars — spills to a second SMS segment`);
  console.log(`ok  ${String(body.length).padStart(3)}/160  ${template}`);
}
console.log("\nall sms bodies fit one segment at worst-case name and stop length");
