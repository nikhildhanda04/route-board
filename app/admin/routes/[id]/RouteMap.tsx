"use client";

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

export type StopPoint = { id: string; name: string; lat: number; lng: number; seq: number };

/* Same square blue-on-paper pin the parent's map draws — one world, one mark.
   Here it carries the stop's number in the route order. */
const BLUE = "#2E3A8C";
const SHEET = "#FBFCFD";

function markerIcon(seq: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      box-sizing:border-box;width:24px;height:24px;background:${SHEET};color:${BLUE};
      border:2px solid ${BLUE};display:flex;align-items:center;justify-content:center;
      font:700 11px 'Archivo Narrow',system-ui;
    ">${seq + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function RouteMap({
  stops,
  onAddStop,
  onDeleteStop,
}: {
  stops: StopPoint[];
  onAddStop: (lat: number, lng: number) => void;
  onDeleteStop: (stopId: string) => void;
}) {
  const center: [number, number] = stops.length
    ? [stops.reduce((a, s) => a + s.lat, 0) / stops.length, stops.reduce((a, s) => a + s.lng, 0) / stops.length]
    : [12.9716, 77.5946];

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler onClick={onAddStop} />
      {stops.length > 1 && (
        <Polyline positions={stops.map((s) => [s.lat, s.lng])} pathOptions={{ color: BLUE, weight: 2, opacity: 0.55, dashArray: "2 7" }} />
      )}
      {stops.map((stop) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={markerIcon(stop.seq)}>
          <Popup>
            <div className="text-sm font-medium">{stop.name}</div>
            <button
              onClick={() => onDeleteStop(stop.id)}
              className="text-xs text-red-600 mt-1 underline"
            >
              Remove stop
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
