// The five parent notifications from the plan, as plain SMS bodies.
//
// SMS bills per 160-character segment, so each body is written to land inside
// one: the child's name and the stop name are the only variable-length parts,
// and the tracking link is a 44-character ref rather than a signed token.
// Rendered identically in the admin Messages log and on the wire.
const BODIES: Record<string, string> = {
  child_boarded: "{{1}} boarded bus {{2}} at {{3}}. Track: {{4}}",
  reached_school: "{{1}} reached school at {{2}}.",
  left_school: "{{1}} boarded the bus home at {{2}}. Track: {{3}}",
  reached_stop: "{{1}} got off at {{2}} at {{3}}.",
  not_boarded: "{{1}} did not board the bus at {{2}} today.",
};

export function renderTemplate(template: string, params: string[]): string {
  const body = BODIES[template] ?? template;
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}
