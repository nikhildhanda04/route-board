/*
  The three states a school's data passes through on its way to a route sheet,
  drawn rather than described. The same sixteen homes appear in all three
  panels in the same positions — that repetition is the whole point, because
  what changes between panels is only what has been *decided* about them.

  Illustration, and labelled as such on the page. The colony names are
  Rohtak's; the grid is not a map of it.
*/
const INK = "#1B2026";
const PENCIL = "#5C6276";
const FAINT = "#6E7689";
const BLUE = "#2E3A8C";
const BLUE_3 = "#C3CAE6";
const BLUE_4 = "#E7EAF5";
const BUS = "#F0AE07";
const SHEET = "#FBFCFD";

/** Cluster centres, and the four homes that fall around each. */
const STOPS = [
  { x: 78, y: 112, name: "Model Town", time: "07:05", n: 4 },
  { x: 214, y: 100, name: "Shivaji Colony", time: "07:12", n: 4 },
  { x: 70, y: 206, name: "DLF Colony", time: "07:09", n: 4 },
  { x: 208, y: 200, name: "Sector 14", time: "07:17", n: 4 },
];
const JITTER = [
  [-20, -13], [17, -18], [-10, 17], [22, 10],
];
const HOMES = STOPS.flatMap((s) => JITTER.map(([dx, dy]) => ({ x: s.x + dx, y: s.y + dy })));
const SCHOOL = { x: 142, y: 272 };

const PANEL_X = [0, 330, 660];

function Panel({
  i, n, title, children,
}: { i: number; n: string; title: string; children: React.ReactNode }) {
  return (
    <g transform={`translate(${PANEL_X[i]} 0)`}>
      <text x={0} y={16} fill={BLUE} fontSize={17} fontWeight={700} fontFamily="var(--font-narrow), sans-serif">
        {n}
      </text>
      <text x={26} y={15} fill={INK} fontSize={10.5} letterSpacing="0.08em" fontWeight={600}>
        {title.toUpperCase()}
      </text>
      <line x1={0} y1={28} x2={300} y2={28} stroke={BLUE_3} strokeWidth={1} />
      {children}
    </g>
  );
}

function Home({ x, y, dim = false }: { x: number; y: number; dim?: boolean }) {
  return <circle cx={x} cy={y} r={3.4} fill={dim ? BLUE_3 : PENCIL} />;
}

function Stop({ x, y }: { x: number; y: number }) {
  return <rect x={x - 7} y={y - 7} width={14} height={14} fill={SHEET} stroke={BLUE} strokeWidth={2} />;
}

export default function RoutePlanDiagram() {
  return (
    <div className="overflow-x-auto bg-sheet">
      <svg
        viewBox="0 0 960 320"
        className="min-w-[48rem] w-full h-auto block px-6 py-7"
        role="img"
        aria-label="Three panels. First, sixteen homes scattered across a neighbourhood with one address written as a landmark. Second, the same homes circled into four walkable stops, each given the name the neighbourhood uses. Third, the same four stops joined into two bus routes running to the school, each with a time."
      >
        {/* I — the addresses as they arrive */}
        <Panel i={0} n="I" title="Where they live">
          {HOMES.map((h, k) => <Home key={k} {...h} />)}
          {/* One address, written the way Indian addresses actually are. */}
          <line x1={HOMES[1].x} y1={HOMES[1].y} x2={160} y2={56} stroke={BLUE_3} strokeWidth={1} />
          <rect x={112} y={42} width={168} height={20} fill={BLUE_4} stroke={BLUE_3} strokeWidth={1} />
          <text x={120} y={56} fill={PENCIL} fontSize={9.5} fontFamily="var(--font-typed), monospace">
            H.No 412, Gali 5, near Gaushala
          </text>
          <text x={0} y={306} fill={FAINT} fontSize={10.5}>
            A spreadsheet column, not coordinates.
          </text>
        </Panel>

        {/* II — homes gathered into named stops */}
        <Panel i={1} n="II" title="Walkable stops">
          {STOPS.map((s) => (
            <circle
              key={s.name} cx={s.x} cy={s.y} r={32}
              fill="none" stroke={BLUE_3} strokeWidth={1.5} strokeDasharray="4 4"
            />
          ))}
          {HOMES.map((h, k) => <Home key={k} {...h} dim />)}
          {STOPS.map((s) => (
            <g key={s.name}>
              <Stop x={s.x} y={s.y} />
              <text x={s.x} y={s.y + 46} fill={INK} fontSize={10.5} textAnchor="middle" fontWeight={600}>
                {s.name}
              </text>
              <text x={s.x} y={s.y + 58} fill={FAINT} fontSize={10} textAnchor="middle" fontFamily="var(--font-typed), monospace">
                {s.n} children
              </text>
            </g>
          ))}
          <text x={0} y={306} fill={FAINT} fontSize={10.5}>
            Named what the neighbourhood calls it.
          </text>
        </Panel>

        {/* III — stops split across two buses and put in order */}
        <Panel i={2} n="III" title="Two buses, in order">
          {/* Bus A, yellow, takes the northern pair. Yellow is the vehicle. */}
          <polyline
            points={`${STOPS[0].x},${STOPS[0].y} ${STOPS[1].x},${STOPS[1].y} ${SCHOOL.x},${SCHOOL.y}`}
            fill="none" stroke={BUS} strokeWidth={3}
          />
          {/* Bus B, duplicator blue, takes the southern pair. */}
          <polyline
            points={`${STOPS[2].x},${STOPS[2].y} ${STOPS[3].x},${STOPS[3].y} ${SCHOOL.x},${SCHOOL.y}`}
            fill="none" stroke={BLUE} strokeWidth={2} strokeDasharray="7 5"
          />
          {STOPS.map((s) => (
            <g key={s.name}>
              <Stop x={s.x} y={s.y} />
              <text x={s.x} y={s.y - 14} fill={PENCIL} fontSize={10} textAnchor="middle" fontFamily="var(--font-typed), monospace">
                {s.time}
              </text>
            </g>
          ))}
          {/* The bus itself, mid-leg on the yellow route. */}
          <rect x={138} y={98} width={16} height={16} fill={BUS} stroke={INK} strokeWidth={2} />
          <rect x={SCHOOL.x - 11} y={SCHOOL.y - 11} width={22} height={22} fill={BLUE} />
          <text x={SCHOOL.x + 20} y={SCHOOL.y + 4} fill={INK} fontSize={10.5} letterSpacing="0.08em" fontWeight={600}>
            SCHOOL · 07:35
          </text>
          <text x={0} y={306} fill={FAINT} fontSize={10.5}>
            Under capacity, counted back from the bell.
          </text>
        </Panel>
      </svg>
    </div>
  );
}
