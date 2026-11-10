/**
 * Background scenes shared by the settings page, the floating converter and
 * the fallback window, chosen in Settings > Appearance:
 *  - waves: silk ribbons in the accent colour over soft light fields;
 *  - hyperspace: light trails projected from 3D depth into a glowing core;
 *  - mountains: layered ridges from a sunset sky to deep-blue pine forests.
 * All generated procedurally (seeded, so identical on every load) and built
 * with DOM calls so they can live inside any web page. Anything moving behind
 * glass makes the glass redraw, so motion comes in slow waves with long
 * pauses, and stops entirely when motion is off.
 */
import { h } from "./dom.ts";
import { s } from "./icons.ts";

export const ART_CSS = `
.cosmos { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: inherit;
  background: radial-gradient(70% 60% at 50% 46%, #0a1838 0%, #050a1c 40%, #02030a 100%); }
.cosmos > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.cosmos .warp { animation: fhp-surge 36s ease-in-out infinite, fhp-hue 54s ease-in-out infinite; }
/* Long holds between gentle changes keep the glass from redrawing constantly. */
@keyframes fhp-surge { 0%, 38% { transform: scale(1); } 50%, 88% { transform: scale(1.05); } 100% { transform: scale(1); } }
@keyframes fhp-hue { 0%, 40% { filter: hue-rotate(0deg); } 52%, 88% { filter: hue-rotate(-24deg); } 100% { filter: hue-rotate(0deg); } }
[data-motion="off"] .cosmos *, [data-motion="off"] .cosmos { animation: none !important; }
@media (prefers-reduced-motion: reduce) { .cosmos, .cosmos * { animation: none !important; } }
.cosmos.waves { background: var(--canvas); }
.cosmos.waves .glow { opacity: 0.55; }
[data-theme="light"] .cosmos.waves .glow { opacity: 0.35; }
.cosmos.waves .ribbons { opacity: 0.9; }
[data-theme="light"] .cosmos.waves .ribbons { opacity: 0.75; }
.cosmos.mountains { background: #f6a03c; }
/* Hyperspace and mountains are dark scenes: text sitting directly on them stays
   light even in light theme, and light glass gets more body to stay crisp. */
[data-theme="light"][data-wallpaper="on"]:not([data-scene="waves"]) :is(main > section > h1, .made-by, .cv .foot) { color: #f5f5f7; }
[data-theme="light"][data-wallpaper="on"]:not([data-scene="waves"]) :is(.lead, main .section-title, .cv .made-by) { color: rgb(235 235 245 / 0.72); }
[data-theme="light"][data-wallpaper="on"]:not([data-scene="waves"]) .cv .foot { color: rgb(235 235 245 / 0.6); }
[data-theme="light"][data-wallpaper="on"]:not([data-scene="waves"]):not([data-liquid="on"]) .panel > .lg-warp { background: rgb(255 255 255 / max(var(--lg-tint-a), 0.78)); }
/* Dark glass over the bright sunset needs more body so it reads as dark glass, not orange. */
[data-theme="dark"][data-wallpaper="on"][data-scene="mountains"]:not([data-liquid="on"]) .panel > .lg-warp { background: rgb(20 20 30 / max(var(--lg-tint-a), 0.62)); }
/* The mountain sky is bright at the top; a soft shadow keeps light text legible. */
[data-wallpaper="on"][data-scene="mountains"] :is(main > section > h1, .lead, main .section-title, .made-by, .cv .foot, .cv .made-by) { color: #fff; text-shadow: 0 1px 12px rgb(60 20 40 / 0.55); }
.panel-art { position: absolute; inset: 0; z-index: 0; border-radius: inherit; overflow: hidden; pointer-events: none; }
[data-wallpaper="off"] .panel-art, [data-wallpaper="off"] .cosmos { display: none; }
`;

let uid = 0;

/** Small seeded PRNG so the field is identical on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const stop = (offset: number, color: string, opacity = 1) =>
  s("stop", { offset, style: `stop-color:${color};stop-opacity:${opacity}` });
const mix = (other: string, pct = 55) => `color-mix(in srgb, var(--accent) ${pct}%, ${other})`;

// Weighted palette: the accent leads, with warm and cool light trails around it.
const PALETTE: [string, number][] = [
  ["var(--accent)", 0.28],
  [mix("#ff9f0a", 30), 0.2],
  ["#ff9f0a", 0.12],
  ["#ff375f", 0.1],
  [mix("#bf5af2", 35), 0.1],
  ["#64d2ff", 0.12],
  ["#ffd60a", 0.05],
  ["#ffffff", 0.03]
];

const LAYOUTS = {
  page: { w: 1440, h: 900, cx: 720, cy: 420, stars: 900, size: 1 },
  panel: { w: 360, h: 640, cx: 180, cy: 290, stars: 380, size: 0.6 }
};

// Depth bands: far stars are tiny and sharp, near ones long, wide and out of focus.
const FAR = 0.62;
const NEAR = 0.26;

/**
 * The hyperspace scene. Stars sit at real depths in 3D space and are projected
 * as they rush toward the viewer: each trail runs from where the star was
 * (depth z + dz) to where it is now (depth z). Distance alone then sets a
 * trail's length, width, brightness and focus, which is what gives it depth.
 * `kind` picks the composition for a full page or the 360px converter.
 */
function hyperspace(kind: "page" | "panel") {
  const L = LAYOUTS[kind];
  const id = `fhp-warp-${uid++}`;
  const random = rng(kind === "page" ? 21 : 5);
  const maxR = Math.hypot(L.w, L.h) / 2;
  const focal = maxR * 0.42;
  const travel = 0.17; // how far each star moved during the "exposure"
  const pick = () => {
    let r = random();
    for (const [color, weight] of PALETTE) if ((r -= weight) <= 0) return color;
    return PALETTE[0][0];
  };

  const far: SVGElement[] = [];
  const mid: SVGElement[] = [];
  const near: SVGElement[] = [];
  const cores: SVGElement[] = [];

  for (let i = 0; i < L.stars; i++) {
    const angle = random() * Math.PI * 2;
    const offAxis = 0.04 + 0.96 * Math.sqrt(random()); // distance from the flight axis
    const z = 0.08 + 0.92 * random() ** 0.5; // most stars are far away
    const rNow = (focal * offAxis) / z;
    const rThen = (focal * offAxis) / (z + travel);
    if (rThen > maxR * 1.4) continue; // already flown past the screen

    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const closeness = 1 - (z - 0.08) / 0.92; // 1 = right next to you, 0 = far away
    const wOut = (0.3 + 15 * closeness ** 2.6) * L.size; // width where the star is now
    const wIn = wOut * 0.12; // needle-thin where it came from
    const outer = Math.min(rNow, maxR * 1.6);

    // Tapered wedge from the far point (thin) to the near point (wide).
    const p = (r: number, w: number, side: 1 | -1) =>
      `${(L.cx + ux * r - uy * w * side).toFixed(1)} ${(L.cy + uy * r + ux * w * side).toFixed(1)}`;
    const d = `M${p(rThen, wIn / 2, 1)} L${p(outer, wOut / 2, 1)} L${p(outer, wOut / 2, -1)} L${p(rThen, wIn / 2, -1)} Z`;
    const color = pick();
    const opacity = (0.3 + 0.7 * closeness ** 0.8).toFixed(2);
    const trail = s("path", { d, fill: color, opacity });

    if (z > FAR) far.push(trail);
    else if (z > NEAR) mid.push(trail);
    else near.push(trail);

    // Bright near trails get a hot white centre line, like real light streaks.
    if (z < 0.4 && random() > 0.35) {
      const dCore = `M${p(rThen, wIn / 6, 1)} L${p(outer, wOut / 6, 1)} L${p(outer, wOut / 6, -1)} L${p(rThen, wIn / 6, -1)} Z`;
      cores.push(s("path", { d: dCore, fill: "#ffffff", opacity: (0.35 + 0.5 * closeness).toFixed(2) }));
    }
  }

  const box = { viewBox: `0 0 ${L.w} ${L.h}`, preserveAspectRatio: "xMidYMid slice" };
  const blur = (name: string, std: number) =>
    s("filter", { id: `${id}-${name}`, x: "-30%", y: "-30%", width: "160%", height: "160%" }, s("feGaussianBlur", { stdDeviation: std }));
  const scene = s("svg", box,
    s("defs", {},
      // Trails fade in from the core instead of starting abruptly.
      s("radialGradient", { id: `${id}-fade`, cx: L.cx, cy: L.cy, r: maxR, gradientUnits: "userSpaceOnUse" },
        stop(0, "#000"), stop(0.03, "#fff", 0.35), stop(0.2, "#fff"), stop(1, "#fff")),
      s("mask", { id: `${id}-mask` }, s("rect", { width: L.w, height: L.h, fill: `url(#${id}-fade)` })),
      blur("glow", 3 * L.size),
      blur("near", 5 * L.size),
      blur("bloom", 14 * L.size),
      s("radialGradient", { id: `${id}-core`, cx: L.cx, cy: L.cy, r: maxR * 0.42, gradientUnits: "userSpaceOnUse" },
        stop(0, "#ffffff", 0.95), stop(0.08, "#bfe3ff", 0.75), stop(0.3, mix("#0a84ff", 45), 0.3), stop(1, "#0a84ff", 0)),
      s("radialGradient", { id: `${id}-vignette`, cx: "50%", cy: "50%", r: "75%" },
        stop(0.5, "#000", 0), stop(1, "#000", 0.6))
    ),
    s("circle", { cx: L.cx, cy: L.cy, r: maxR * 0.42, fill: `url(#${id}-core)` }),
    s("g", { class: "warp", style: `transform-origin:${L.cx}px ${L.cy}px`, mask: `url(#${id}-mask)` },
      // Far field: dense, tiny, sharp.
      s("g", {}, ...far),
      // Mid field: crisp trails over their own soft glow.
      s("g", { filter: `url(#${id}-glow)` }, ...mid.map((n) => n.cloneNode() as SVGElement)),
      s("g", {}, ...mid),
      // Near field: big, bright and out of focus, with a wide bloom.
      s("g", { filter: `url(#${id}-bloom)`, opacity: 0.8 }, ...near.map((n) => n.cloneNode() as SVGElement)),
      s("g", { filter: `url(#${id}-near)` }, ...near),
      s("g", { filter: `url(#${id}-glow)` }, ...cores)
    ),
    s("rect", { width: L.w, height: L.h, fill: `url(#${id}-vignette)` })
  );

  return [scene, grainLayer(id, L.w, L.h, 0.06)];
}

/** Fine grain so gradients don't band. */
const grainLayer = (id: string, w: number, hgt: number, opacity: number) =>
  s("svg", { viewBox: `0 0 ${w} ${hgt}`, preserveAspectRatio: "xMidYMid slice", style: `opacity:${opacity};mix-blend-mode:overlay` },
    s("filter", { id: `${id}-grain` },
      s("feTurbulence", { type: "fractalNoise", baseFrequency: 0.9, numOctaves: 2, stitchTiles: "stitch" }),
      s("feColorMatrix", { values: "0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.6 0" })),
    s("rect", { width: w, height: hgt, filter: `url(#${id}-grain)` }));

// ─── Waves ───────────────────────────────────────────────────────────────────
const WAVES = {
  page: {
    w: 1440, h: 900, blur: 70,
    glows: [[160, 80, 420, 260, "var(--accent)"], [1320, 220, 380, 300, mix("#bf5af2", 50)], [760, 900, 560, 260, mix("#64d2ff", 50)], [60, 760, 320, 220, mix("#ff375f", 60)]],
    a: "M-80 560 C 220 420, 460 700, 760 560 S 1240 300, 1520 430 L1520 540 C 1250 420, 1010 660, 740 690 S 230 560, -80 700 Z",
    sheen: "M-80 560 C 220 420, 460 700, 760 560 S 1240 300, 1520 430 L1520 470 C 1240 350, 980 610, 750 600 S 240 470, -80 600 Z",
    b: "M1520 140 C 1220 260, 1000 60, 700 190 S 220 330, -80 220 L-80 270 C 220 390, 470 260, 720 260 S 1240 300, 1520 230 Z",
    c: "M-80 880 C 300 760, 640 900, 980 780 S 1380 700, 1520 760 L1520 830 C 1340 790, 1080 900, 900 900 Z"
  },
  panel: {
    w: 360, h: 640, blur: 40,
    glows: [[40, 40, 200, 150, "var(--accent)"], [340, 330, 170, 170, mix("#bf5af2", 50)], [80, 620, 220, 140, mix("#64d2ff", 50)]],
    a: "M-40 250 C 60 190, 160 330, 250 260 S 360 170, 420 220 L420 280 C 340 230, 270 340, 190 340 S 40 270, -40 330 Z",
    sheen: "M-40 250 C 60 190, 160 330, 250 260 S 360 170, 420 220 L420 240 C 340 200, 260 310, 190 312 S 40 240, -40 290 Z",
    b: "M420 470 C 320 520, 230 420, 140 480 S 20 560, -40 520 L-40 560 C 40 610, 150 540, 230 530 S 360 560, 420 520 Z",
    c: "M-40 90 C 60 40, 180 120, 280 70 S 380 40, 420 60 L420 92 C 330 80, 260 140, 170 130 S 40 100, -40 130 Z"
  }
} as const;

function waves(kind: "page" | "panel") {
  const W = WAVES[kind];
  const id = `fhp-waves-${uid++}`;
  const box = { viewBox: `0 0 ${W.w} ${W.h}`, preserveAspectRatio: "xMidYMid slice" };
  const scene = s("svg", box,
    s("defs", {},
      s("linearGradient", { id: `${id}-a`, x1: 0, y1: 0, x2: 1, y2: 0.2 },
        stop(0, "var(--accent)", 0), stop(0.3, "var(--accent)", 0.95), stop(0.7, mix("#bf5af2")), stop(1, mix("#ff375f", 40), 0.2)),
      s("linearGradient", { id: `${id}-b`, x1: 1, y1: 0, x2: 0, y2: 0.3 },
        stop(0, mix("#64d2ff", 50), 0.1), stop(0.45, mix("#64d2ff", 65)), stop(1, "var(--accent)", 0)),
      s("linearGradient", { id: `${id}-c`, x1: 0, y1: 1, x2: 1, y2: 0 },
        stop(0, mix("#ffffff"), 0), stop(0.5, mix("#ffffff"), 0.8), stop(1, mix("#ff375f", 60), 0)),
      s("linearGradient", { id: `${id}-sheen`, x1: 0, y1: 0, x2: 0, y2: 1 }, stop(0, "#ffffff", 0.45), stop(0.5, "#ffffff", 0)),
      s("filter", { id: `${id}-soft`, x: "-30%", y: "-30%", width: "160%", height: "160%" }, s("feGaussianBlur", { stdDeviation: W.blur }))
    ),
    s("g", { class: "glow", filter: `url(#${id}-soft)` },
      ...W.glows.map(([cx, cy, rx, ry, fill]) => s("ellipse", { cx, cy, rx, ry, style: `fill:${fill}` }))),
    s("g", { class: "ribbons" },
      s("path", { d: W.a, fill: `url(#${id}-a)` }),
      s("path", { d: W.sheen, fill: `url(#${id}-sheen)` }),
      s("path", { d: W.b, fill: `url(#${id}-b)` }),
      s("path", { d: W.c, fill: `url(#${id}-c)` }))
  );
  return [scene, grainLayer(id, W.w, W.h, 0.05)];
}

// ─── Mountains ───────────────────────────────────────────────────────────────
// Back to front: sunset coral, rose, mauve, violet, blue, deep navy.
const RIDGE_COLORS = ["#f39a6b", "#e77b74", "#c9677f", "#a05a8c", "#6f5498", "#4a4f9a", "#30418a", "#1f3070", "#14214f"];

/** Ridge heights by midpoint displacement: rough at large scales, finer detail on top. */
function ridgeLine(random: () => number, levels: number, roughness: number) {
  const n = 2 ** levels + 1;
  const pts = new Array<number>(n).fill(0);
  pts[0] = random() - 0.5;
  pts[n - 1] = random() - 0.5;
  for (let step = n - 1, amp = 1; step > 1; step /= 2, amp *= roughness) {
    for (let i = step / 2; i < n; i += step) pts[i] = (pts[i - step / 2] + pts[i + step / 2]) / 2 + (random() - 0.5) * amp;
  }
  return pts;
}

/** A layered pine: three stacked tiers on a short trunk. */
function pine(x: number, base: number, height: number) {
  const w = height * 0.36;
  const tier = (top: number, bottom: number, half: number) =>
    `M${x.toFixed(1)} ${top.toFixed(1)} L${(x + half).toFixed(1)} ${bottom.toFixed(1)} L${(x + half * 0.35).toFixed(1)} ${bottom.toFixed(1)} ` +
    `L${x.toFixed(1)} ${(bottom - (bottom - top) * 0.1).toFixed(1)} L${(x - half * 0.35).toFixed(1)} ${bottom.toFixed(1)} L${(x - half).toFixed(1)} ${bottom.toFixed(1)} Z`;
  return [
    tier(base - height, base - height * 0.55, w * 0.55),
    tier(base - height * 0.72, base - height * 0.28, w * 0.78),
    tier(base - height * 0.46, base - height * 0.04, w),
    `M${(x - w * 0.06).toFixed(1)} ${(base - height * 0.06).toFixed(1)} h${(w * 0.12).toFixed(1)} v${(height * 0.08).toFixed(1)} h${(-w * 0.12).toFixed(1)} Z`
  ].join(" ");
}

function mountains(kind: "page" | "panel") {
  const portrait = kind === "panel";
  const W = portrait ? 360 : 1440;
  const H = portrait ? 640 : 900;
  const id = `fhp-mtn-${uid++}`;
  const random = rng(portrait ? 33 : 17);
  const layers = RIDGE_COLORS.length;
  const top = H * (portrait ? 0.16 : 0.2);
  const bottom = H * (portrait ? 0.84 : 0.86);

  const defs = s("defs", {},
    s("linearGradient", { id: `${id}-sky`, x1: 0, y1: 0, x2: 0, y2: 1 },
      stop(0, "#f7c04a"), stop(0.35, "#f59a45"), stop(0.7, "#ee7a58"), stop(1, "#e7676a")),
    s("radialGradient", { id: `${id}-sun`, cx: portrait ? "60%" : "62%", cy: "18%", r: "45%" },
      stop(0, "#fff3c4", 0.9), stop(0.25, "#ffd27a", 0.45), stop(1, "#ffd27a", 0))
  );
  const nodes: SVGElement[] = [
    s("rect", { width: W, height: H, fill: `url(#${id}-sky)` }),
    s("rect", { width: W, height: H, fill: `url(#${id}-sun)` })
  ];

  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 = farthest ridge, 1 = nearest
    const baseY = top + (bottom - top) * t ** 0.9;
    const amp = H * (portrait ? 0.07 + 0.05 * t : 0.09 + 0.05 * t);
    const pts = ridgeLine(random, 7, 0.52 + 0.06 * t);
    const step = (W + 40) / (pts.length - 1);
    const ys = pts.map((p) => baseY - p * amp * 2);
    let d = `M-20 ${H} L-20 ${ys[0].toFixed(1)}`;
    ys.forEach((y, k) => (d += ` L${(-20 + k * step).toFixed(1)} ${y.toFixed(1)}`));
    d += ` L${W + 20} ${H} Z`;

    // Each ridge is a little lighter toward its crest: atmospheric haze.
    const color = RIDGE_COLORS[i];
    defs.append(s("linearGradient", { id: `${id}-r${i}`, x1: 0, y1: 0, x2: 0, y2: 1 },
      stop(0, `color-mix(in srgb, ${color} 82%, #ffd8b0)`), stop(0.35, color), stop(1, `color-mix(in srgb, ${color} 80%, #0a0f2a)`)));
    nodes.push(s("path", { d, fill: `url(#${id}-r${i})` }));

    // Pine forests along the nearer ridges, larger the closer they are.
    if (t > 0.55) {
      const count = Math.round((portrait ? 16 : 34) * (t - 0.45));
      const trees: string[] = [];
      for (let k = 0; k < count; k++) {
        const x = random() * W;
        const yAt = ys[Math.min(ys.length - 1, Math.max(0, Math.round((x + 20) / step)))];
        const height = H * (0.025 + 0.07 * (t - 0.55) * 2.2) * (0.6 + random() * 0.6);
        trees.push(pine(x, yAt + height * 0.12, height));
      }
      nodes.push(s("path", { d: trees.join(" "), fill: `color-mix(in srgb, ${color} 75%, #050818)` }));
    }
  }

  // Foreground: a few tall pines framing the scene, darkest of all.
  const fg: string[] = [];
  const tall = portrait ? 4 : 7;
  for (let k = 0; k < tall; k++) {
    const x = (k / (tall - 1)) * W + (random() - 0.5) * (W / tall) * 0.8;
    fg.push(pine(x, H + 10, H * (portrait ? 0.24 : 0.17) + H * random() * (portrait ? 0.12 : 0.1)));
  }
  nodes.push(s("path", { d: fg.join(" "), fill: "#0c1638" }));
  nodes.push(s("rect", { y: H * 0.97, width: W, height: H * 0.03, fill: "#0c1638" }));

  const scene = s("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMax slice" }, defs, ...nodes);
  return [scene, grainLayer(id, W, H, 0.05)];
}

export type Scene = "waves" | "hyperspace" | "mountains";

/** The chosen background scene. `kind` picks the composition for a full page or the 360px converter. */
export function sceneArt(scene: Scene, kind: "page" | "panel" = "page") {
  const layers = scene === "waves" ? waves(kind) : scene === "mountains" ? mountains(kind) : hyperspace(kind);
  return h("div", { class: `cosmos ${scene}`, "aria-hidden": "true" }, ...layers);
}

/** Puts `scene` into `host`, replacing whatever scene was there; no-op if unchanged. */
export function mountScene(host: HTMLElement, scene: Scene, kind: "page" | "panel") {
  if (host.dataset.scene === scene && host.firstElementChild) return;
  host.dataset.scene = scene;
  host.replaceChildren(sceneArt(scene, kind));
}

/** Background art layer for the floating converter; fill it with mountScene(). */
export function panelArt() {
  return h("div", { class: "panel-art", "aria-hidden": "true" });
}
