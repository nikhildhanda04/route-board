import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, Courier_Prime } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });
const archivoNarrow = Archivo_Narrow({ variable: "--font-archivo-narrow", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
const courier = Courier_Prime({ variable: "--font-courier-prime", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "RouteBoard — know the moment a child boards the bus",
  description:
    "School bus boarding, attendance and parent SMS alerts for Indian schools. The driver taps a roster; every guardian knows within seconds. No hardware, no parent app.",
  // iOS ignores manifest icons and the standalone display mode comes from a
  // meta tag there, not from the manifest.
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "RouteBoard", statusBarStyle: "black-translucent" },
};

const DIRECTION = `
  DIRECTION - THE WALL TIMETABLE
  World: the printed, pencilled chart in a school transport office.
  Materials: cool bond paper, graphite print, duplicator blue for every rule
  and fill, pencil for the annotation layer, one red pen for the exception, and
  school-bus yellow - which is only ever the bus itself, a live cell, or the
  highlighter over the one line that matters. Nothing else.
  Structure: rows are routes, columns are the day's four moments. Every surface
  is built from one ruled cell in four states - printed, pencilled, filled,
  struck.
  Moment: the chart writes itself left to right, which is what actually happens
  as a driver taps names at a stop.
  Reach: admin is the whole chart, the driver PWA is one column of it at thumb
  size, a parent sees a single row - their child's day.
  Voice: the school reads the chart; the parent reads one child. The landing
  page leads with the parent's question, because that is what a school buys.
`;

export const viewport: Viewport = { themeColor: "#2E3A8C" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoNarrow.variable} ${courier.variable}`}>
      <body className="font-sans">
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${DIRECTION}-->` }} />
        {children}
      </body>
    </html>
  );
}
