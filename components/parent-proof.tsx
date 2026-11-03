import { SmsIcon } from "./chart";

/*
  What a parent actually holds: the message, then the map it opens. This is the
  product's own surface reproduced at hero size — same frame, same cells, same
  square pins as app/t/[token] — not an illustration of it. The bus is the only
  yellow thing on the page that moves.
*/

/* The route the bus is on, in the map's own coordinates. */
const ROUTE = "M 18 162 L 76 150 L 104 104 L 168 92 L 196 48 L 288 36";
const STOPS: { x: number; y: number; mine?: boolean }[] = [
  { x: 18, y: 162 },
  { x: 104, y: 104, mine: true },
  { x: 196, y: 48 },
  { x: 288, y: 36 },
];
const BUS = { x: 76, y: 150 };

function MiniMap() {
  return (
    <svg viewBox="0 0 320 200" className="w-full block" role="img" aria-label="The bus two stops before your child's stop">
      <rect width="320" height="200" fill="var(--color-sheet-2)" />
      {/* The sheet under the map is still ruled paper. */}
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="var(--color-blue-3)" strokeWidth="1" />
      ))}
      {[80, 160, 240].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="var(--color-blue-3)" strokeWidth="1" />
      ))}

      <path d={ROUTE} fill="none" stroke="var(--color-blue-2)" strokeWidth="2" strokeDasharray="2 7" />
      {/* Travelled already: solid, up to the bus. */}
      <path d="M 18 162 L 76 150" fill="none" stroke="var(--color-blue)" strokeWidth="2" />

      {STOPS.map((s) => (
        <rect
          key={`${s.x}-${s.y}`}
          x={s.x - (s.mine ? 7 : 4)}
          y={s.y - (s.mine ? 7 : 4)}
          width={s.mine ? 14 : 8}
          height={s.mine ? 14 : 8}
          fill={s.mine ? "var(--color-blue)" : "var(--color-sheet)"}
          stroke="var(--color-blue)"
          strokeWidth="2"
        />
      ))}

      <g transform={`translate(${BUS.x - 13} ${BUS.y - 13})`}>
        <rect width="26" height="26" fill="var(--color-bus)" stroke="var(--color-ink)" strokeWidth="2" />
        {/* The bus glyph, drawn at this scale rather than nested as an <svg>. */}
        <g
          transform="translate(4.2 4.4) scale(0.73)"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="13" rx="1.5" />
          <path d="M4 10h16M9 4v6M15 4v6M7 17v2.5M17 17v2.5" />
        </g>
      </g>

      <text
        x={STOPS[1].x - 7}
        y={STOPS[1].y - 14}
        className="stamp"
        fill="var(--color-blue)"
        style={{ fontSize: 9, letterSpacing: "0.09em" }}
      >
        YOUR STOP
      </text>
    </svg>
  );
}

export default function ParentProof() {
  return (
    <figure className="chart max-w-[23rem] mx-auto lg:mx-0">
      <figcaption className="chart-head px-4 py-2.5 flex items-center justify-between gap-3">
        <span>What a parent sees</span>
        <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">example message</span>
      </figcaption>

      {/* The message. One SMS, one segment, the real template. */}
      <div className="px-4 py-4 flex gap-3 border-b border-blue-3">
        <SmsIcon className="w-4 h-4 text-blue shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="typed text-[0.8125rem] leading-snug">
            Aarav boarded bus KA-01-AB-5521 at 07:42. Track: &hellip;/t/9mKd2
          </p>
          <p className="stamp text-faint mt-2">Delivered 07:42 · one SMS</p>
        </div>
      </div>

      {/* What the link opens. */}
      <MiniMap />

      <div className="grid grid-cols-2 border-t-2 border-blue">
        <div className="px-4 py-3.5 bg-blue-4 text-blue">
          <div className="typed text-[0.9375rem] leading-none">07:42</div>
          <div className="stamp mt-2 opacity-80">On board</div>
        </div>
        <div className="px-4 py-3.5 rule-y-bold" style={{ background: "var(--color-bus-3)" }}>
          <div className="flex items-center gap-2">
            <span className="live-dot shrink-0" aria-hidden />
            <span className="typed text-[0.9375rem] leading-none text-ink">2 stops away</span>
          </div>
          <div className="stamp mt-2 text-pencil">Bus moving</div>
        </div>
      </div>
    </figure>
  );
}
