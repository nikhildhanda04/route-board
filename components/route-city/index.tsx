"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import RoutePlanDiagram from "../route-plan-diagram";

/*
  The city is three.js, which is a few hundred kilobytes, so it is never part
  of the first load: it is imported only once we know the visitor has a GPU and
  a screen worth drawing on. Everyone else — a phone, a locked-down browser, no
  JavaScript at all — gets the flat drawing, which says the same thing.
*/
const RouteCity = dynamic(() => import("./RouteCity"), { ssr: false });

export default function RouteCityOrDiagram() {
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 640) return;
    try {
      const c = document.createElement("canvas");
      if (c.getContext("webgl2") ?? c.getContext("webgl")) setDraw(true);
    } catch {
      /* no WebGL — the flat drawing stands in, and nothing is lost */
    }
  }, []);

  return draw ? <RouteCity /> : <RoutePlanDiagram />;
}
