import type { ReactNode } from "react";

/**
 * The whole design system is this file: one ruled sheet, one ruled cell, four
 * cell states, and a small drawn icon set. Every surface — landing, admin,
 * driver, parent — is assembled from these, which is why they all read as the
 * same chart.
 */

export type CellState = "printed" | "pencilled" | "filled" | "struck";

const CELL_STATE: Record<CellState, string> = {
  // Printed but not yet happened: the chart as it left the duplicator.
  printed: "bg-sheet text-faint",
  // Happening now: the bus is out. Yellow on this chart only ever means live.
  pencilled: "bg-bus-3 text-ink",
  // Done, inked in.
  filled: "bg-blue-4 text-blue",
  // Marked in red pen.
  struck: "bg-red-2 text-red",
};

export function Cell({
  state = "printed",
  code,
  note,
  index,
  size = "md",
  className = "",
  children,
}: {
  state?: CellState;
  /** The short code the chart carries, typewriter-set. */
  code?: string;
  /** The smaller hand beneath it — a time, a count, an initial. */
  note?: string;
  /** Position in the writing order. Drives the one authored motion. */
  index?: number;
  /** "lg" is the landing hero, where the chart is the thesis rather than a table. */
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col justify-center ${
        size === "lg" ? "px-4 py-4 min-h-[5rem]" : "px-3 py-2.5 min-h-[3.75rem]"
      } ${CELL_STATE[state]} ${
        index === undefined ? "" : "writes-in"
      } ${className}`}
      style={index === undefined ? undefined : ({ "--cell": index } as React.CSSProperties)}
    >
      {code !== undefined && (
        <div className={`typed leading-tight ${size === "lg" ? "text-[1.0625rem]" : "text-[0.8125rem]"}`}>
          {state === "struck" ? <span className="struck">{code}</span> : code}
        </div>
      )}
      {note !== undefined && (
        <div className={`stamp opacity-80 ${size === "lg" ? "mt-2" : "mt-1"}`}>{note}</div>
      )}
      {children}
    </div>
  );
}

/**
 * A pinned sheet. The heavy frame and the printed header band are the two
 * things that make a grid read as a chart rather than as a table.
 */
export function Sheet({
  title,
  meta,
  action,
  children,
  className = "",
}: {
  title: string;
  /** Typewriter-set reference line: date, sheet number, count. */
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`chart ${className}`}>
      <header className="chart-head px-4 py-2.5 flex items-baseline justify-between gap-4">
        <h2 className="truncate">{title}</h2>
        <div className="flex items-baseline gap-4 shrink-0">
          {meta && <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">{meta}</span>}
          {action}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Column headings inside a sheet: roman numerals and names, as on a timetable. */
export function ColumnHead({ cols, className = "" }: { cols: string[]; className?: string }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
      {cols.map((c, i) => (
        <div
          key={c}
          className={`stamp text-pencil px-3 py-1.5 bg-sheet-2 border-b border-blue-3 ${i > 0 ? "rule-y" : ""}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- icons */
/* One stroke weight, one corner treatment, drawn for this chart. */

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function BusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...ICON}>
      <rect x="4" y="4" width="16" height="13" rx="1.5" />
      <path d="M4 10h16M9 4v6M15 4v6" />
      <path d="M7 17v2.5M17 17v2.5" />
    </svg>
  );
}

export function TickIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...ICON}>
      <path d="M4.5 12.5 9.5 18 19.5 6" />
    </svg>
  );
}

export function CrossIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...ICON}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function StopIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...ICON}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function SmsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...ICON}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
    </svg>
  );
}
