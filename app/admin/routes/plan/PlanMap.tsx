"use client";

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { PlannedRoute } from "@/lib/routing";
import { routeColor } from "./colors";

/*
  The draft on a map. Each bus gets its own colour so a transport head can see
  at a glance whether two buses are covering the same street — the one thing a
  table of stop names will never show them.
*/
const SHEET = "#FBFCFD";
const INK = "#1B2026";

function stopIcon(seq: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      box-sizing:border-box;width:22px;height:22px;background:${SHEET};color:${INK};
      border:2px solid ${color};display:flex;align-items:center;justify-content:center;
      font:700 10px 'Archivo Narrow',system-ui;
    ">${seq + 1}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const schoolIcon = L.divIcon({
  className: "",
  html: `<div style="
    box-sizing:border-box;width:26px;height:26px;background:${INK};color:${SHEET};
    display:flex;align-items:center;justify-content:center;font:700 9px 'Archivo Narrow',system-ui;
  ">SCH</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const homeIcon = L.divIcon({
  className: "",
  html: `<div style="width:6px;height:6px;background:#5C6276;border-radius:50%;opacity:0.6"></div>`,
  iconSize: [6, 6],
  iconAnchor: [3, 3],
});

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function PlanMap({
  routes,
  school,
  homes,
  highlight,
  onClick,
}: {
  routes: PlannedRoute[];
  school: { lat: number; lng: number } | null;
  homes?: { lat: number; lng: number }[];
  /** Index of the route the sheet is hovering, or null for all. */
  highlight: number | null;
  onClick?: (lat: number, lng: number) => void;
}) {
  const pts = routes.flatMap((r) => r.stops.map((s) => [s.lat, s.lng] as [number, number]));
  const center: [number, number] = school
    ? [school.lat, school.lng]
    : pts.length
      ? [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
      : [28.8955, 76.6066];

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler onClick={onClick} />

      {/* Homes first and faintest: they are the evidence, not the plan. */}
      {homes?.map((h, i) => <Marker key={`h${i}`} position={[h.lat, h.lng]} icon={homeIcon} />)}

      {routes.map((r, i) => {
        const dim = highlight !== null && highlight !== i;
        const color = routeColor(i);
        const line: [number, number][] = [
          ...r.stops.map((s) => [s.lat, s.lng] as [number, number]),
          ...(school ? [[school.lat, school.lng] as [number, number]] : []),
        ];
        return (
          <div key={r.busId}>
            <Polyline
              positions={line}
              pathOptions={{ color, weight: dim ? 2 : 4, opacity: dim ? 0.2 : 0.85 }}
            />
            {!dim && r.stops.map((s, k) => (
              <Marker key={s.key} position={[s.lat, s.lng]} icon={stopIcon(k, color)}>
                <Popup>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs">{s.scheduledTime} · {s.studentIds.length} children</div>
                  <div className="text-xs opacity-70">{r.plate}</div>
                </Popup>
              </Marker>
            ))}
          </div>
        );
      })}

      {school && <Marker position={[school.lat, school.lng]} icon={schoolIcon} />}
    </MapContainer>
  );
}
