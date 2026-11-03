"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { strokes, buildings, ROUTES, STOPS, SCHOOL, AREAS, at, HALF, T, type P3, type Stroke } from "./city";

/*
  An isometric city drawn in ink, a stroke at a time, with the school's two
  buses running it.

  The idea is Sanskriti B's line-city (github.com/sanskritib/line-city), which
  has no licence on it — so this is written from the technique its README
  describes in the open, not from its source: an orthographic camera down the
  diagonal, every line in one buffer with its own start time, and a fragment
  shader that refuses to paint any part of a line the pen has not reached yet.
  The city it draws is ours: stops, routes, a bus, and nothing decorative.

  The buildings are paper-coloured solids, the same colour as the ground and
  the page. You never see them — they exist to hide the lines behind them, so
  what is on screen is only what a person would actually have drawn.
*/

const PAPER = "#FBFCFD";
const INK = new THREE.Color("#1B2026");
const FAINT = new THREE.Color("#C3CAE6");
const BLUE = new THREE.Color("#2E3A8C");
const BUS = new THREE.Color("#F0AE07");
const COLORS = { ink: INK, faint: FAINT, blue: BLUE, bus: BUS };

const VERT = /* glsl */ `
  attribute float aT;
  attribute float aStart;
  attribute vec3 aColor;
  varying float vT;
  varying float vStart;
  varying vec3 vColor;
  void main() {
    vT = aT; vStart = aStart; vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
  aT is how far along its own line a vertex sits, so it interpolates across a
  segment — which is what lets one shared buffer reveal every line from its own
  start, at its own pace, without a draw call each.
*/
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uStroke;
  varying float vT;
  varying float vStart;
  varying vec3 vColor;
  void main() {
    float p = clamp((uTime - vStart) / uStroke, 0.0, 1.0);
    if (vT > p) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

const v = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/** The pin over a stop: a mast and a flag, in its bus's colour. */
function pins(): Stroke[] {
  const out: Stroke[] = [];
  const mark = (p: P3, color: Stroke["color"], h: number, start: number) => {
    const [x, , z] = p;
    out.push({ pts: [[x, 0, z], [x, h, z]], start, color });
    out.push({
      pts: [[x, h, z], [x + 3.2, h, z], [x + 3.2, h - 2.3, z], [x, h - 2.3, z], [x, h, z]],
      start: start + 0.12,
      color,
    });
  };
  STOPS.forEach((s, i) => {
    const route = ROUTES.find((r) => r.stops.includes(i))!;
    mark(at(s.ij), route.color, 11, T.pins + i * 0.1);
  });
  mark(at(SCHOOL.ij), "ink", 14, T.pins + 0.45);
  return out;
}

/** One buffer for every line in the drawing. */
function lineGeometry(all: Stroke[]) {
  const pos: number[] = [], aT: number[] = [], aStart: number[] = [], aColor: number[] = [];
  for (const s of all) {
    const lens = [0];
    for (let i = 1; i < s.pts.length; i++) lens.push(lens[i - 1] + v(s.pts[i]).distanceTo(v(s.pts[i - 1])));
    const total = lens.at(-1) || 1;
    const c = COLORS[s.color];
    for (let i = 1; i < s.pts.length; i++) {
      for (const k of [i - 1, i]) {
        pos.push(...s.pts[k]);
        aT.push(lens[k] / total);
        aStart.push(s.start);
        aColor.push(c.r, c.g, c.b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute("aStart", new THREE.Float32BufferAttribute(aStart, 1));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(aColor, 3));
  return g;
}

/** A route is too important to be a one-pixel line, so it is a ribbon laid on
    the road, mitred so the corners keep their width. */
function ribbon(path: P3[], color: THREE.Color, start: number, width = 1.6) {
  const pts = path.map(v);
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = lens.at(-1) || 1;

  const dir = (i: number) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    return new THREE.Vector3().subVectors(b, a).setY(0).normalize();
  };

  const pos: number[] = [], aT: number[] = [], aStart: number[] = [], aColor: number[] = [];
  const edges = pts.map((p, i) => {
    const d = dir(i);
    const n = new THREE.Vector3(-d.z, 0, d.x);
    // A right-angle turn would pinch the ribbon to 71% without this.
    const seg = i === 0 ? dir(0) : new THREE.Vector3().subVectors(pts[i], pts[i - 1]).setY(0).normalize();
    const miter = Math.max(0.5, n.dot(new THREE.Vector3(-seg.z, 0, seg.x)));
    const o = n.clone().multiplyScalar(width / 2 / miter);
    return [p.clone().add(o).setY(0.07), p.clone().sub(o).setY(0.07)] as const;
  });

  for (let i = 1; i < edges.length; i++) {
    const [al, ar] = edges[i - 1], [bl, br] = edges[i];
    const ta = lens[i - 1] / total, tb = lens[i] / total;
    for (const [p, t] of [[al, ta], [ar, ta], [bl, tb], [ar, ta], [br, tb], [bl, tb]] as const) {
      pos.push((p as THREE.Vector3).x, (p as THREE.Vector3).y, (p as THREE.Vector3).z);
      aT.push(t as number);
      aStart.push(start);
      aColor.push(color.r, color.g, color.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute("aStart", new THREE.Float32BufferAttribute(aStart, 1));
  g.setAttribute("aColor", new THREE.Float32BufferAttribute(aColor, 3));
  return { geometry: g, points: pts, lengths: lens, total };
}

export default function RouteCity({ onDrawn }: { onDrawn?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const areaLabels = useRef<(HTMLDivElement | null)[]>([]);
  const replay = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(PAPER, 1);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const D = 42;
    const camera = new THREE.OrthographicCamera(-D, D, D, -D, 1, 600);
    camera.position.set(110, 92, 110);
    camera.lookAt(0, 9, 0);

    /* Paper solids. Same colour as the page, so they are never seen — they are
       here only to hide the lines behind them. */
    const paper = new THREE.MeshBasicMaterial({
      color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 4, HALF * 4), paper);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    scene.add(ground);

    const blocks = buildings();
    const solids = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), paper, blocks.length);
    const m = new THREE.Matrix4();
    blocks.forEach((b, i) => {
      m.makeScale(b.w, b.h, b.d).setPosition(b.x, b.h / 2, b.z);
      solids.setMatrixAt(i, m);
    });
    scene.add(solids);

    const uniforms = { uTime: { value: 0 }, uStroke: { value: T.stroke } };
    const lineMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const faceMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide,
    });

    scene.add(new THREE.LineSegments(lineGeometry(strokes()), lineMat));

    /* Everything from here is the plan laid over the place: it ignores depth,
       so a rooftop can never hide the route a bus actually takes. */
    const planLine = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false,
    });
    const planFace = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide, depthTest: false,
    });

    const ribbons = ROUTES.map((r) => ribbon(r.path, COLORS[r.color], T.routes, r.color === "bus" ? 2.2 : 1.8));
    ribbons.forEach((rb) => {
      const mesh = new THREE.Mesh(rb.geometry, planFace);
      mesh.renderOrder = 2;
      scene.add(mesh);
    });

    const pinLines = new THREE.LineSegments(lineGeometry(pins()), planLine);
    pinLines.renderOrder = 3;
    scene.add(pinLines);

    /* The bus itself: the one solid object in the drawing, because it is the
       one thing that is not a plan. */
    const bus = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 2.9, 2.6),
      new THREE.MeshBasicMaterial({ color: BUS, depthTest: false })
    );
    bus.add(body);
    bus.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: INK, depthTest: false })
    ));
    bus.renderOrder = 4;
    bus.position.y = 1.5;
    bus.visible = false;
    scene.add(bus);

    const yellow = ribbons[0];
    const lap = yellow.total;

    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.left = -D * aspect; camera.right = D * aspect;
      camera.top = D; camera.bottom = -D;
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    /* Labels are HTML, not sprites — they are the page's own type, and they
       have to read at any zoom. Positioned by hand each frame rather than
       through React, which would re-render sixty times a second. */
    const anchors = [...STOPS.map((s) => at(s.ij)), at(SCHOOL.ij)].map((p) => new THREE.Vector3(p[0] + 3.2, 11, p[2]));
    anchors[anchors.length - 1].setY(14);
    const areaAnchors = AREAS.map((a) => {
      const p = at(a.ij);
      return new THREE.Vector3(p[0], 0, p[2]);
    });
    const place = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const put = (a: THREE.Vector3, node: HTMLDivElement | null) => {
        if (!node) return;
        const p = a.clone().project(camera);
        node.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px)`;
      };
      anchors.forEach((a, i) => put(a, labels.current[i]));
      areaAnchors.forEach((a, i) => put(a, areaLabels.current[i]));
    };

    let raf = 0;
    let t0 = performance.now();
    let announced = false;
    const END = T.bus;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = reduce ? 1e4 : (performance.now() - t0) / 1000;
      uniforms.uTime.value = t;

      if (t >= T.bus || reduce) {
        bus.visible = true;
        const u = reduce ? 0.18 : ((t - T.bus) % T.busLap) / T.busLap;
        const want = u * lap;
        let i = 1;
        while (i < yellow.lengths.length - 1 && yellow.lengths[i] < want) i++;
        const span = yellow.lengths[i] - yellow.lengths[i - 1] || 1;
        const f = (want - yellow.lengths[i - 1]) / span;
        const a = yellow.points[i - 1], b = yellow.points[i];
        bus.position.set(a.x + (b.x - a.x) * f, 1.5, a.z + (b.z - a.z) * f);
        bus.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      }

      if (!announced && (t >= END || reduce)) { announced = true; onDrawn?.(); }

      // Labels appear with their own pin, not before it. The colony names come
      // in earlier, with the buildings they belong to — they are the place, and
      // the place is there before anyone plans a route across it.
      anchors.forEach((_, i) => {
        const node = labels.current[i];
        if (node) node.style.opacity = t >= T.pins + i * 0.1 + 0.3 ? "1" : "0";
      });
      areaAnchors.forEach((_, i) => {
        const node = areaLabels.current[i];
        if (node) node.style.opacity = t >= T.buildings + T.buildingSpread + i * 0.08 ? "1" : "0";
      });

      place();
      renderer.render(scene, camera);
    };
    frame();

    replay.current = () => { t0 = performance.now(); announced = false; };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      replay.current = null;
      scene.traverse((o) => {
        const any = o as THREE.Mesh;
        any.geometry?.dispose?.();
      });
      lineMat.dispose(); faceMat.dispose(); planLine.dispose(); planFace.dispose(); paper.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [onDrawn]);

  const all = [...STOPS, SCHOOL];

  return (
    <div className="relative bg-sheet">
      <div ref={host} className="h-[22rem] sm:h-[28rem] lg:h-[32rem] w-full" />

      {all.map((s, i) => (
        <div
          key={s.name}
          ref={(n) => { labels.current[i] = n; }}
          className="absolute top-0 left-0 pointer-events-none transition-opacity duration-500 opacity-0"
        >
          <div className="bg-sheet border border-blue-3 px-2 py-1 -translate-y-1/2 whitespace-nowrap">
            <div className="stamp text-ink leading-none">{s.name}</div>
            <div className="typed text-[0.625rem] text-faint leading-none mt-1">
              {s.time}
              {"children" in s ? ` · ${s.children} children` : ""}
            </div>
          </div>
        </div>
      ))}

      {AREAS.map((a, i) => (
        <div
          key={a.name}
          ref={(n) => { areaLabels.current[i] = n; }}
          className="absolute top-0 left-0 pointer-events-none transition-opacity duration-700 opacity-0"
        >
          {/* A paper chip, because a colony name has to survive being read over
              a rooftop — the labels ignore depth, the type must not. */}
          <div className="stamp text-faint whitespace-nowrap -translate-x-1/2 -translate-y-1/2 bg-sheet/90 px-1.5 py-0.5">
            {a.name}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => replay.current?.()}
        className="stamp absolute bottom-3 right-3 bg-sheet border border-blue-2 text-blue px-3 py-1.5 hover:bg-blue-4 transition-colors"
      >
        Draw it again
      </button>
    </div>
  );
}
