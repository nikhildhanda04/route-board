"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";

type Stop = { id: string; name: string; lat: number; lng: number; seq: number };

/* World colors, drawn marks. The child's own stop is the only filled pin. */
const BLUE = "#2E3A8C";
const SHEET = "#FBFCFD";
const BUS = "#F0AE07";   /* the bus is the one yellow thing on the map */
const INK = "#1B2026";

function stopIcon(isStudentStop: boolean) {
  const size = isStudentStop ? 26 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;box-sizing:border-box;
      background:${isStudentStop ? BLUE : SHEET};
      border:2px solid ${BLUE};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/*
  A fix we still trust is the solid yellow bus. One we have stopped trusting is
  drawn hollow and half-faded: it is where the bus was, not where it is, and the
  map must not claim otherwise.
*/
const makeBusIcon = (stale: boolean) => L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;box-sizing:border-box;background:${stale ? SHEET : BUS};
    border:2px ${stale ? "dashed" : "solid"} ${INK};opacity:${stale ? 0.55 : 1};
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px -2px rgba(27,32,38,${stale ? ".2" : ".5"});
  ">
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="${INK}"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="4" width="16" height="13" rx="1.5"/>
      <path d="M4 10h16M9 4v6M15 4v6M7 17v2.5M17 17v2.5"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const busIcon = makeBusIcon(false);
const busIconStale = makeBusIcon(true);

export default function TrackMap({
  stops, studentStopId, busLocation, busFixStale = false,
}: {
  stops: Stop[]; studentStopId: string | null; busLocation: { lat: number; lng: number } | null;
  /** The newest fix is older than GPS_FRESH_MS — show a last known position. */
  busFixStale?: boolean;
}) {
  const points = stops.map((s): [number, number] => [s.lat, s.lng]);
  const center: [number, number] = busLocation
    ? [busLocation.lat, busLocation.lng]
    : points.length
    ? points[Math.floor(points.length / 2)]
    : [12.9716, 77.5946];

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: BLUE, weight: 2, opacity: 0.55, dashArray: "2 7" }} />}
      {stops.map((st) => (
        <Marker key={st.id} position={[st.lat, st.lng]} icon={stopIcon(st.id === studentStopId)}>
          <Tooltip direction="top">{st.name}</Tooltip>
        </Marker>
      ))}
      {busLocation && (
        <Marker position={[busLocation.lat, busLocation.lng]} icon={busFixStale ? busIconStale : busIcon}>
          <Tooltip direction="top">{busFixStale ? "Bus — last known position" : "Bus"}</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
