---
name: RouteBoard
description: The printed, pencilled wall timetable of a school transport office, rendered as software.
colors:
  wall: "#DCE1E7"
  sheet: "#FBFCFD"
  sheet-2: "#F2F5F8"
  ink: "#1B2026"
  pencil: "#5C6276"
  faint: "#6E7689"
  blue: "#2E3A8C"
  blue-2: "#6675C4"
  blue-3: "#C3CAE6"
  blue-4: "#E7EAF5"
  red: "#C62B1F"
  red-2: "#FBE6E3"
  bus: "#F0AE07"
  bus-2: "#FBDE92"
  bus-3: "#FDF3DC"
typography:
  display:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  hero-lede:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.625
  lede:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  typed:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  caption:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  control:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
  stamp:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.09em"
  column-head:
    fontFamily: "Archivo Narrow, Archivo, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.07em"
rounded:
  none: "0"
spacing:
  hair: "0.375rem"
  tight: "0.5rem"
  cell-y: "0.625rem"
  cell-x: "0.75rem"
  band: "1rem"
  room: "1.25rem"
  section: "2.5rem"
  bay: "3.5rem"
components:
  cell-printed:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.faint}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0.75rem"
    height: "3.75rem"
  cell-pencilled:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0.75rem"
    height: "3.75rem"
  cell-filled:
    backgroundColor: "{colors.blue-4}"
    textColor: "{colors.blue}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0.75rem"
    height: "3.75rem"
  cell-struck:
    backgroundColor: "{colors.red-2}"
    textColor: "{colors.red}"
    rounded: "{rounded.none}"
    padding: "0.625rem 0.75rem"
    height: "3.75rem"
  cell-lg:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
    height: "5rem"
  sheet-head:
    backgroundColor: "{colors.sheet-2}"
    textColor: "{colors.blue}"
    typography: "{typography.column-head}"
    rounded: "{rounded.none}"
    padding: "0.625rem 1rem"
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.sheet}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0.6875rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  button-quiet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.blue}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0.6875rem 1.25rem"
  button-quiet-hover:
    backgroundColor: "{colors.blue-4}"
    textColor: "{colors.blue}"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.typed}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.625rem"
    width: "100%"
  field-label:
    backgroundColor: "transparent"
    textColor: "{colors.pencil}"
    typography: "{typography.stamp}"
  nav-item:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.sheet}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0.625rem 1.25rem"
  nav-item-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.blue}"
---

# Design System: RouteBoard

## Overview

**Creative North Star: "The Wall Timetable"**

The whole system is one object: the printed-and-pencilled chart pinned in an Indian
school's transport office. Cool bond paper, graphite print, duplicator blue for every
rule and fill, pencil for the hand that corrects the print, and one red pen kept for the
exception. Nothing in the interface is made of a material that is not on that desk — no
gradient, no glass, no card floating in space.

Its grammar is a grid, not a page. Rows are routes; columns are the day's four moments.
Every surface in the product is assembled from one ruled cell in four states — printed
(not yet happened), pencilled (happening now, written over the print), filled (done,
inked), struck (marked in red pen) — and from one pinned sheet with a heavy frame and a
printed header band. That is why the landing hero, the admin dashboard, the driver's
thumb-sized roster and a parent's single row all read as the same chart at different
magnifications: admin is the whole chart, the driver PWA is one column of it, a parent
sees one row, their child's day.

The build is light-only on purpose. There is no dark mode and no theme switch, because
the two real use scenes are a desk in daylight and a driver's phone in sunlight; a dark
sheet would be a category habit, not a reading of either. Density is high and even:
information is set in tabular type at a size you can read across a desk, and the chart
never softens a fact to make a screen calmer.

**Key Characteristics:**
- Five materials only: paper, graphite, duplicator blue, pencil, one red pen.
- Square corners everywhere; zero border-radius in the entire interface.
- Every rule is a 1px or 2px line, never a shadow or a gap.
- Machine-read facts (codes, times, counts, registrations) are typewriter-set and tabular.
- Light-only, chosen from the use scene: daylight desk, sunlit windscreen.
- One authored motion: the chart writes itself left to right.

## Colors

A cool-paper neutral field, one structural ink in four tints, and a single red reserved
for a human exception.

### Primary
- **Duplicator Blue** (`{colors.blue}`): every rule, frame, header fill, link, focus ring,
  primary button, the admin index rail, the driver's sticky trip header, selection and
  caret. It is the ink the chart was printed in, which is why it can carry structure and
  action at once without competing.
- **Mid Rule Blue** (`{colors.blue-2}`): the column division that has earned more weight
  than a hairline, and the resting border of an input.
- **Hairline Blue** (`{colors.blue-3}`): the default interior rule of every grid, the
  scrollbar thumb, the underline beneath a column-head band.
- **Wash Blue** (`{colors.blue-4}`): the fill of a completed cell and the hover of a quiet
  button. The lightest possible "this is done".

### Secondary
- **Red Pen** (`{colors.red}`): a child who is not on the bus. Struck codes, the strike
  line itself, the exception count, the offline badge on a driver's phone, the border
  of the "did not board" band.
- **Red Wash** (`{colors.red-2}`): the fill behind a struck cell or an exception band.
- **Bus Yellow** (`{colors.bus}`): the vehicle itself — the bus marker on every map, the
  border of a live chip. Never a brand accent and never a warning colour.
- **Highlighter** (`{colors.bus-2}`): the marker stroke run over the one line on a page
  that matters. One per page at most.
- **Live Wash** (`{colors.bus-3}`): the fill of a cell whose trip is running right now —
  the `pencilled` state. Yellow on the chart always means the bus is out.

### Neutral
- **Board Grey** (`{colors.wall}`): the board the chart is pinned to — the page behind
  every sheet, and the driver app's background.
- **Bond Paper** (`{colors.sheet}`): the sheet itself; every content surface, and the
  text colour of anything set on inked blue.
- **Banded Paper** (`{colors.sheet-2}`): alternating bands, header and footer fills,
  column-head strips, disabled field backgrounds, the map canvas while tiles load.
- **Graphite** (`{colors.ink}`): printed type, the driver app's top bar, and the hover
  state of the primary button.
- **Pencil** (`{colors.pencil}`): the second hand — annotations, lede and secondary prose,
  field labels, inactive navigation.
- **Faint** (`{colors.faint}`): captions, placeholders, disabled type, a printed cell whose
  moment has not happened yet.

### Named Rules
**The Yellow Rule.** Yellow is the bus, or it is live, or it is the highlighter over one
line. It is never a brand accent, never a warning, never a third status colour. A yellow
cell means that trip is running at this moment; a yellow marker on a map is a vehicle.

**The Red Pen Rule.** Red marks one thing: a child who is not on the bus (or the system's
inability to send that fact). It is never a brand accent, never a destructive-button
colour by habit, never decoration. If a screen shows red and no child is unaccounted for,
the red is wrong.

**The Five Materials Rule.** Paper, graphite, duplicator blue, pencil, red pen. A new
surface may not introduce a sixth colour. Semantic states that are not "exception" are
expressed with the blue tints and the paper bands, not with green, amber, or purple.

**The Daylight Rule.** Light-only. No dark mode, no theme toggle, no `prefers-color-scheme`
branch. The product is read on a daylit desk and through a sunlit windscreen; contrast is
tuned for glare, not for a dark room.

## Typography

**Display Font:** Archivo Narrow (with Archivo, sans-serif)
**Body Font:** Archivo (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** Courier Prime (with ui-monospace, monospace)

**Character:** Condensed grotesque caps for everything the chart has printed on it, a plain
upright grotesque for the sentences a person reads, and a typewriter face for everything a
machine or a clock produced. The pairing is an office document, not a brand: narrow where
space is ruled, monospaced where digits must align down a column.

### Hierarchy
- **Display** (Archivo Narrow 700, `clamp(2.6rem, 7.5vw, 5.25rem)`, line-height 0.88,
  tracking -0.025em, uppercase): the landing thesis only. One per site.
- **Headline** (Archivo Narrow 700, `clamp(1.75rem, 4vw, 2.75rem)`, line-height 0.95,
  tracking -0.02em, uppercase): landing section openings; `text-balance` on, capped around
  18–22ch so a heading breaks like a chart title rather than a paragraph.
- **Title** (Archivo Narrow 700, `clamp(1.5rem, 3.5vw, 2.25rem)`, line-height 1,
  tracking -0.02em, uppercase): every admin page title and the driver's trip screens.
- **Lede** (Archivo 400, 1.0625rem, relaxed, pencil): the paragraph under a heading and the
  route name inside a chart row. Set to 42–62ch, never wider.
- **Body** (Archivo 400, 0.9375rem / 0.875rem): all running prose, table text, list rows.
- **Typed** (Courier Prime 400, 0.8125rem — 0.6875rem for reference lines, tabular-nums,
  tracking -0.02em): codes, counts, times, bus registrations, sheet meta lines, error text,
  input values. Anything a clock, a tap or a database produced.
- **Stamp** (Archivo Narrow 600, 0.625rem, tracking 0.09em, uppercase): legends, column
  heads inside a sheet, field labels, button text, nav labels, status chips.
- **Column Head** (Archivo Narrow 600, 0.6875rem, tracking 0.07em, uppercase, blue): the
  printed header band at the top of a sheet.

### Named Rules
**The Typewriter Rule.** If a value came off a clock, a tap, a form field or a database row,
it is set in Courier Prime with tabular numerals. If it came off a writer, it is set in
Archivo. Never mix the two inside one string.

**The Narrow Caps Rule.** Every heading and every label is Archivo Narrow, bold or
semibold, uppercase. Sentence-case headings do not exist in this system; the chart's titles
were printed, not written.

## Layout

The spatial model is a ruled grid, not a stack of cards. Content lives inside a `Sheet`:
a 2px blue frame, a printed header band, then rows separated by hairline rules. Interior
structure is drawn with borders only — `rule-x` (1px hairline, top) between rows, `rule-y`
(1px hairline, left) between columns, `rule-y-bold` (1px mid blue) where a column division
is a real division of the day. Adjacent cells touch; there is no gutter inside a sheet.

Containers: the marketing and admin chart tops out at 72rem (`max-w-6xl`, occasionally
82rem for a wide planner); the driver surface is capped at 28rem (`max-w-md`) and centred,
so the phone layout is literally one column of the chart; login and short forms sit in
24rem (`max-w-sm`). Prose measure is clamped in `ch` (42–62ch), never in px.

Admin uses a fixed left index rail — 3.5rem collapsed to numerals, 14rem at `lg` with
labels — inked solid blue so the sheet beside it reads as paper. The driver surface
substitutes a sticky blue trip header plus sticky `sheet-2` stop bands, and reserves the
bottom of the viewport for one full-width action button (7rem of bottom padding keeps the
last roster row clear of it).

Spacing rhythm is a 4px base used sparsely: `0.375rem` label gap, `0.5rem`/`0.625rem` inside
a field, `0.625rem × 1rem` inside a chart cell, `1rem` as the standard band padding,
`1.25rem` for form interiors, `2.5rem`–`3.5rem` between landing sections. Cells have
minimum heights rather than vertical centring tricks: 3.75rem at `md`, 5rem at `lg`.

### Named Rules
**The Ruled Cell Rule.** New surfaces are composed from the existing `Cell` and `Sheet`, in
one of the four cell states. A new surface that needs a container does not get a new
container; it gets a sheet.

**The Thumb Column Rule.** Any driver-facing surface is one column at `max-w-md`, with tap
targets at least 3.75rem tall and the primary action pinned to the bottom edge.

## Elevation & Depth

Almost flat. Depth is carried by ruled lines and by paper-on-board tone — a `sheet` surface
on a `wall` background, with blue rules doing the work that shadows do elsewhere. There is
exactly one ambient shadow in the system, and it exists to make a sheet read as pinned
paper rather than as a floating card. Buttons, inputs, cells, nav items, chips and bands
have no shadow in any state.

### Shadow Vocabulary
- **Pinned Sheet** (`box-shadow: 0 1px 0 var(--color-blue-3), 0 14px 28px -20px rgb(27 32 38 / 0.45)`):
  the `.chart` frame only. A hairline sitting under the bottom rule plus a wide, very soft
  cast — paper lifted a millimetre off a board.
- **Written-In Field** (`box-shadow: inset 0 -2px 0 var(--color-blue)`): the focus state of
  an input. An inset stroke, not a lift — the line you write on gets darker.

### Named Rules
**The Pinned Sheet Rule.** One shadow, one owner. Only `.chart` casts. Anything else that
wants separation gets a rule, a tonal band, or nothing.

## Shapes

Zero radius, everywhere, with no exceptions in the shipped UI: buttons, fields, cells,
sheets, badges, chips and map pins are square. Form is made of rectangles and 1–2px
straight rules; weight is the only variable (hairline `blue-3`, mid `blue-2`, heavy 2px
`blue`, and 2px `red` where a sheet carries an exception). The outer frame of a sheet is
heavy the way a printed chart's frame is heavy; everything inside it is a hairline until a
column division earns a mid rule.

Icons are a drawn set, not a library: 24×24 viewBox, `stroke-width: 1.6`, round caps and
joins, `currentColor`, no fills — bus, tick, cross, stop pin, SMS. One stroke weight across
the whole set.

### Named Rules
**The Square Corner Rule.** No border-radius. If a shape needs to feel softer, it gets more
padding, not a curve.

**The One Stroke Rule.** Every icon is drawn at 1.6 stroke weight in `currentColor`, inline
SVG. The set is closed; a new glyph is drawn to match, never imported.

## Components

### Buttons
- **Shape:** square (0 radius), 1px border matching its own fill.
- **Primary:** inked solid duplicator blue on paper-white text, stamp type (Archivo Narrow
  600 uppercase, 0.75rem, 0.09em tracking), `0.6875rem 1.25rem` padding. On a driver screen
  it goes full width at `py-4`.
- **Hover / Focus:** background and border shift to graphite over 0.15s on the chart easing
  (`cubic-bezier(0.16, 1, 0.3, 1)`); focus shows the global 2px blue outline at 1px offset.
- **Disabled:** 0.45 opacity, `not-allowed` cursor; no colour change.
- **Quiet:** paper background with blue text, same border and type; hovers to wash blue.

### Cards / Containers (Sheet)
- **Corner Style:** square.
- **Background:** bond paper, with a banded-paper header and footer.
- **Shadow Strategy:** the single Pinned Sheet shadow (see Elevation & Depth).
- **Border:** 2px duplicator blue outer frame; 2px blue under the header band; hairline
  blue interior rules.
- **Internal Padding:** `0.625rem 1rem` in the header and footer bands; cells own their own
  padding; prose blocks get `1.25rem`.
- **Header:** title in column-head caps on the left; an optional typewriter-set reference
  line (date, sheet number, count) and one action on the right, baseline-aligned.

### Inputs / Fields
- **Style:** full-width paper box, 1px mid-blue border, square, `0.5rem 0.625rem` padding,
  value set in Courier Prime at 0.875rem — a blank on a printed form.
- **Label:** stamp caps in pencil, `0.375rem` above the box.
- **Focus:** border darkens to full blue and a 2px blue inset stroke appears along the
  bottom edge; the native outline is suppressed in favour of that stroke.
- **Disabled:** banded-paper fill, faint text. **Error:** the message sits below in typed
  type, red on red wash inside a 1px red border.

### Navigation
- **Admin rail:** solid blue column, roman numerals (I–VII) always visible, stamp-caps
  labels appearing at `lg`. Default labels are paper at 50–60% opacity; hover lifts the
  background 10%; the active item inverts to a paper fill with blue text and a mid-blue
  numeral, and carries `aria-current="page"`. The numerals are the timetable's own
  wayfinding.
- **Landing nav:** stamp caps in pencil, hovering to blue; one inked blue action at the
  right edge.
- **Driver:** no nav. A sticky blue trip header with route name and a live send-queue
  status is the entire chrome.

### The Ruled Cell (signature)
The cell is the system. One component, four states, two sizes:
- **printed** — paper with faint type: the moment has not happened.
- **pencilled** — paper with pencil type over a 45° repeating hairline hatch at 10% opacity:
  happening now, written in by hand over the print.
- **filled** — wash blue with blue type: done, inked in.
- **struck** — red wash with red type, and the code itself wrapped in a strike: a 1.5px red
  line rotated -1.4° across the text. The strike is scoped to the word, not the cell,
  because a pen strikes a word.

A cell carries a typewriter-set code (0.8125rem, or 1.0625rem at `lg`) and an optional
stamp-caps note beneath it at 80% opacity — a time, a count, an initial.

**Motion.** Cells accept a writing index and animate in with `write-in`: 0.5s on the chart
easing, opacity 0 to 1 with `clip-path: inset(0 100% 0 0)` wiping open left to right, each
cell delayed `index × 70ms`. The chart writes itself in the order a driver taps, and a
sheet below the fold holds its cells blank (`[data-cells="false"]` pauses the animation)
until the reader reaches it, so the writing always happens in front of them.

Two quieter motions sit under it. **Reveal** (`components/reveal.tsx`, Motion/framer) fades
a block of reading matter up 18px over 0.7s on the same chart easing, once, when it enters
the viewport; blocks in a group stagger 0.06–0.09s apart. **`.live-dot`** pulses a 0.5rem
yellow square every 2.4s, and is the only looping animation anywhere in the product — it
means a bus is moving right now. Everything is disabled under `prefers-reduced-motion`,
which reduces Reveal to a short fade with no movement.

## Do's and Don'ts

### Do:
- **Do** build every new surface out of `Sheet` and `Cell` in one of the four states; the
  chart is the layout, not a widget inside it.
- **Do** reserve red (`#C62B1F`) for a child who is not on the bus, and nothing else.
- **Do** reserve yellow (`#F0AE07`) for the bus and for live state, and nothing else.
- **Do** set every machine-produced value — time, count, code, registration — in Courier
  Prime with tabular numerals.
- **Do** separate things with a ruled line: hairline `blue-3` inside a sheet, mid `blue-2`
  for a real column division, 2px `blue` for a frame or header edge.
- **Do** keep every corner square and every icon at 1.6 stroke weight in `currentColor`.
- **Do** size driver surfaces for a thumb in sunlight: one `max-w-md` column, rows at least
  3.75rem tall, the primary action pinned to the bottom edge.
- **Do** keep prose measures in `ch` (42–62ch) and headings balanced and short.

### Don't:
- **Don't** add a sixth material. No green "success", no amber "warning", no purple accent;
  state is expressed in the blue tints and paper bands.
- **Don't** add a dark mode or a theme toggle. Light-only is a decision about the desk and
  the windscreen.
- **Don't** give anything but `.chart` a shadow, and never use a shadow where a rule will do.
- **Don't** round a corner, anywhere, including map pins and badges.
- **Don't** put a gutter or gap between cells inside a sheet; adjacent cells share a rule.
- **Don't** animate anything other than the cell write-in and the 0.15s button colour
  transition.
- **Don't** import an icon set or use a glyph/emoji as an icon; draw it into the existing
  stroke set.
- **Don't** set a heading in Archivo (body) or a code in Archivo Narrow; the three faces
  have fixed jobs.
