/*
  Route colours live here rather than in PlanMap because the sheet needs them
  too — and importing anything from PlanMap pulls leaflet onto the server,
  where `window` does not exist. One value, two readers, no map.

  Bus yellow leads: the first route is the one the eye should follow. The rest
  are duplicator inks, not a rainbow.
*/
const ROUTE_COLORS = ["#F0AE07", "#2E3A8C", "#C62B1F", "#6675C4", "#1B2026", "#5C6276"];

export const routeColor = (i: number) => ROUTE_COLORS[i % ROUTE_COLORS.length];
