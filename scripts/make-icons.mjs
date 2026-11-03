/**
 * Renders public/icon.svg into the PNG sizes installers actually read.
 * Chrome will take an SVG in a manifest; Android's launcher and iOS will not.
 *
 *   npm run icons
 *
 * Uses the Playwright chromium already present for screenshots, so there is no
 * image dependency in the tree for three files that change once a year.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");

/* A maskable icon is cropped to a circle by the launcher, so the glyph has to
   sit inside the 80% safe zone with the field bleeding past it. */
const page = (size, pad) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;width:${size}px;height:${size}px;background:#2E3A8C;overflow:hidden}
svg{position:absolute;inset:${pad}px;width:${size - pad * 2}px;height:${size - pad * 2}px}</style>
${svg}`;

const TARGETS = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  { file: "icon-maskable-512.png", size: 512, pad: 54 },
  { file: "apple-touch-icon.png", size: 180, pad: 0 },
];

const browser = await chromium.launch();
for (const t of TARGETS) {
  const p = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  await p.setContent(page(t.size, t.pad), { waitUntil: "load" });
  writeFileSync(new URL(`../public/${t.file}`, import.meta.url), await p.screenshot({ type: "png" }));
  await p.close();
  console.log(`public/${t.file} — ${t.size}×${t.size}`);
}
await browser.close();
