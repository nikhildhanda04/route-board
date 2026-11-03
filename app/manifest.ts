import type { MetadataRoute } from "next";

/*
  "Add to home screen" is how a driver installs RouteBoard, so the install is
  part of the product rather than an afterthought. start_url is /drive, not /:
  the person installing this is a driver, and the landing page is of no use to
  them. Signed-out, /drive redirects to /login, which is the right first screen.
*/
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RouteBoard — driver",
    short_name: "RouteBoard",
    description: "Tap a child's name at the stop. Every guardian knows within seconds.",
    start_url: "/drive",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFCFD",
    theme_color: "#2E3A8C",
    lang: "en-IN",
    categories: ["education", "navigation"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Cropped to a circle by Android's launcher — the glyph sits inside the
      // safe zone with the blue field bleeding past it.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's trips", short_name: "Trips", url: "/drive" },
    ],
  };
}
