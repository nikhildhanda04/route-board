/**
 * Regenerates docs/ONBOARDING-INTAKE.md from the Google Form definition, so the
 * form a school fills in and the sheet we read on a call can never drift apart.
 *
 *   npm run form:doc
 *
 * Also doubles as the check on the form script: it evaluates SECTIONS and fails
 * if a question has a type the Apps Script cannot build.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync(new URL("./onboarding-form.gs", import.meta.url), "utf8");

/* The .gs file is plain ES5 with no imports; evaluating it here is how we read
   one definition from two places instead of maintaining two question lists. */
globalThis.Logger = { log() {} };
globalThis.FormApp = {};
globalThis.SpreadsheetApp = {};
const { SECTIONS, INTRO, test_questionTypesAreKnown } = new Function(
  `${src}; return { SECTIONS, INTRO, test_questionTypesAreKnown };`
)();

test_questionTypesAreKnown();

let out = `# School onboarding intake

The same questions as the Google Form built by \`scripts/onboarding-form.gs\`, for use on a
call, over email, or as a printed sheet. Generated — edit the questions in the \`.gs\` file
and run \`npm run form:doc\`.

> ${INTRO.split("\n\n").join("\n>\n> ")}

`;

for (const s of SECTIONS) {
  out += `## ${s.page}\n\n`;
  if (s.help) out += `_${s.help.replace(/\n+/g, " ")}_\n\n`;
  for (const q of s.questions) {
    out += `- ${q.q}${q.req ? " **(required)**" : ""}\n`;
    if (q.opts) out += `  - ${q.opts.join(" · ")}${q.t.endsWith("Other") ? " · _other_" : ""}\n`;
    if (q.t === "scale") out += `  - 1 (${q.low}) to 5 (${q.high})\n`;
    if (q.t === "long") out += `  - _long answer_\n`;
    if (q.t === "date" || q.t === "time") out += `  - _${q.t}_\n`;
  }
  out += "\n";
}

out += `---

**What we ask for separately, by email:** a sample export of the student list (five rows is
enough, with the real column headings) and the current route sheet. Neither belongs in the
form — a Google file-upload question forces the person filling it to sign in to Google, and
a principal filling this in on a phone will not.
`;

mkdirSync(new URL("../docs/", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/ONBOARDING-INTAKE.md", import.meta.url), out);
console.log(
  `docs/ONBOARDING-INTAKE.md — ${SECTIONS.length} sections, ` +
    `${SECTIONS.reduce((n, s) => n + s.questions.length, 0)} questions`
);
