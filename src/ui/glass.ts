/**
 * Vanilla Liquid Glass engine.
 *
 * Refraction technique adapted from liquid-glass-react (MIT, © 2025 Max
 * Rovensky, https://github.com/rdev/liquid-glass-react): an SVG
 * feDisplacementMap with per-channel chromatic aberration bends the backdrop.
 * The filter runs inside backdrop-filter (Chromium), before the frost blur.
 *
 * Per element we compute, from a rounded-rect signed distance field:
 *  - a displacement map for a thick convex lens rim (strong at the edge,
 *    neutral in the clear centre), always sampling inward and capped so the
 *    image never folds;
 *  - an edge mask so chromatic aberration only appears where light bends;
 *  - a specular rim, lit live from the cursor's direction.
 * The lens also responds: it swells under the pointer and settles with a
 * liquid ease into shape when the glass appears (see `pulse`).
 * Maps are regenerated only when size, radius or depth change.
 */
import { resolveTheme, type Appearance } from "./appearance.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
let uid = 0;

export const FONT_STACK =
  '"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "FHP Inter", "Segoe UI Variable Text", system-ui, sans-serif';

export const GLASS_CSS = `
[data-theme] {
  --lg-tint: rgba(28, 28, 30, var(--lg-tint-a));
  --fg: #f5f5f7;
  --fg-2: rgba(235, 235, 245, 0.62);
  --fg-3: rgba(235, 235, 245, 0.38);
  --hairline: rgba(255, 255, 255, 0.1);
  --fill: rgba(118, 118, 128, 0.18);
  --fill-2: rgba(118, 118, 128, 0.28);
  --surface: #1c1c1e;
  --surface-2: #2c2c2e;
  --canvas: #000;
  --accent-text: color-mix(in srgb, var(--accent) 80%, #fff);
  --shadow: 0 12px 34px rgba(0, 0, 0, 0.32);
  --ease: cubic-bezier(0.25, 0.1, 0.25, 1);
  font-family: ${FONT_STACK};
  font-feature-settings: "cv11", "ss01";
  letter-spacing: -0.01em;
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}
[data-theme="light"] {
  --lg-tint: rgba(255, 255, 255, var(--lg-tint-a));
  --fg: #1d1d1f;
  --fg-2: rgba(60, 60, 67, 0.66);
  --fg-3: rgba(60, 60, 67, 0.42);
  --hairline: rgba(0, 0, 0, 0.08);
  --fill: rgba(118, 118, 128, 0.1);
  --fill-2: rgba(118, 118, 128, 0.18);
  --surface: #fff;
  --surface-2: #f5f5f7;
  --canvas: #f5f5f7;
  --accent-text: color-mix(in srgb, var(--accent) 88%, #000);
  --shadow: 0 12px 34px rgba(30, 40, 80, 0.10);
}
.lg {
  position: relative;
  isolation: isolate;
  border-radius: var(--lg-radius);
  box-shadow: var(--shadow);
  transform: translate(var(--lg-tx, 0px), var(--lg-ty, 0px)) scale(var(--lg-sx, 1), var(--lg-sy, 1)) scale(var(--lg-press, 1));
  transition: transform 0.25s var(--ease);
}
.lg > :not(.lg-layer) { position: relative; z-index: 3; }
.lg-layer { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.lg-svg { width: 0; height: 0; overflow: hidden; }
.lg-warp {
  z-index: 0;
  overflow: hidden;
  background: var(--lg-tint);
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
  -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
}
/* The rim is lit from --lg-angle (toward the cursor): bright arc facing the
   light, a softer reflection on the opposite side, dark elsewhere. */
.lg-spec {
  z-index: 1; background-size: 100% 100%; opacity: var(--lg-spec, 0.75);
  --lg-light: conic-gradient(from calc(var(--lg-angle, 315deg) - 90deg), transparent 0deg, #000 90deg, transparent 175deg, rgba(0,0,0,0.45) 270deg, transparent 360deg);
  -webkit-mask: var(--lg-light);
  mask: var(--lg-light);
}
.lg-shine {
  z-index: 2;
  opacity: 0;
  background: radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.35), transparent 70%);
  transition: opacity 0.2s var(--ease);
}
.lg-interactive { cursor: pointer; }
.lg-interactive:hover > .lg-shine { opacity: 0.5; }
.lg-interactive:active { --lg-press: 0.97; }
.lg-interactive:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
[data-motion="off"] *, [data-motion="off"] *::before, [data-motion="off"] *::after {
  animation-duration: 0.001ms !important; transition-duration: 0.001ms !important;
}
@media (prefers-reduced-motion: reduce) {
  [data-theme] *, [data-theme] *::before, [data-theme] *::after {
    animation-duration: 0.001ms !important; transition-duration: 0.001ms !important;
  }
}
`;

/** Applies theme tokens to a root element (html, or a wrapper inside a shadow root). */
export function applyAppearance(root: HTMLElement, a: Appearance, theme = resolveTheme(a.theme)) {
  root.dataset.theme = theme;
  root.dataset.motion = a.motion ? "on" : "off";
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--lg-blur", `${a.blur}px`);
  set("--lg-sat", `${a.saturation}%`);
  set("--lg-radius", `${a.radius}px`);
  set("--lg-tint-a", String(a.tint));
  set("--lg-spec", String(a.specular));
  set("--accent", a.accent);
  set("--ui-scale", String(a.scale));
}

function sdRoundRect(x: number, y: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

const PROFILE = 1.4; // lens falloff exponent

/** Bezel width in px for an element: the band where the glass curves. */
export function bezelWidth(w: number, h: number, depth: number) {
  return Math.max(6, Math.min(64, Math.min(w, h) * depth));
}

/**
 * Largest displacement scale (px) that never folds the image back on itself.
 * Folding creates mirrored ghost text and seams; a real lens doesn't fold.
 * Offset = scale/2 · (1-u)^P, so its slope across the bezel peaks at scale·P/(2·bezel).
 */
export function foldFreeScale(bezel: number) {
  return (1.8 * bezel) / PROFILE;
}

/**
 * Builds the lens displacement map (R = x, G/B = y, 128 = neutral), the
 * aberration edge mask and the specular rim for a w×h rounded rect.
 */
export function buildMaps(w: number, h: number, radius: number, depth: number) {
  w = Math.round(w);
  h = Math.round(h);
  if (w < 8 || h < 8) return null;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const bezel = bezelWidth(w, h, depth);
  const rimWidth = 1.2 + bezel * 0.05;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const map = ctx.createImageData(w, h);
  const mask = ctx.createImageData(w, h);
  const spec = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = sdRoundRect(px, py, hw, hh, r);
      map.data[i] = map.data[i + 1] = map.data[i + 2] = 128;
      map.data[i + 3] = 255;
      if (d > 0 || -d > bezel) continue;

      const gx = sdRoundRect(px + 1, py, hw, hh, r) - sdRoundRect(px - 1, py, hw, hh, r);
      const gy = sdRoundRect(px, py + 1, hw, hh, r) - sdRoundRect(px, py - 1, hw, hh, r);
      const gl = Math.hypot(gx, gy) || 1;
      const nx = gx / gl;
      const ny = gy / gl;

      // Convex lens: steepest at the very edge, flat by the end of the bezel.
      const u = -d / bezel;
      const mag = Math.pow(1 - u, PROFILE);
      // feDisplacementMap reads from p + scale·(C − 0.5). Point C against the
      // outward normal so every sample stays inside the glass: Chrome only
      // captures a thin margin of backdrop outside the element.
      map.data[i] = 128 - 127 * nx * mag;
      map.data[i + 1] = map.data[i + 2] = 128 - 127 * ny * mag;

      mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 255;
      mask.data[i + 3] = 255 * Math.min(1, mag * 1.4);

      // Direction-free rim; CSS lights the side facing the cursor (see .lg-spec).
      const rim = Math.max(0, 1 - -d / rimWidth);
      const lit = rim + Math.pow(1 - u, 4) * 0.35;
      spec.data[i] = spec.data[i + 1] = spec.data[i + 2] = 255;
      spec.data[i + 3] = 255 * Math.min(1, lit);
    }
  }
  const urls = [map, mask, spec].map((img) => {
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  });
  return { map: urls[0], mask: urls[1], spec: urls[2], w, h };
}

// Pages with a strict img-src CSP block data: images. A failed map would
// shift the whole backdrop, so probe once and fall back to frost only.
let dataImagesAllowed: Promise<boolean> | null = null;
function canUseDataImages(sample: string) {
  dataImagesAllowed ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = sample;
  });
  return dataImagesAllowed;
}

function svgEl(tag: string, attrs: Record<string, string | number>, parent?: Element) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

const CHANNEL = {
  R: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  G: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  B: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
};

function layer(cls: string) {
  const el = document.createElement("span");
  el.className = `lg-layer ${cls}`;
  el.setAttribute("aria-hidden", "true");
  return el;
}

export interface GlassController {
  update(a: Appearance): void;
  /** Liquid "form": the lens eases in from flat, e.g. when the glass appears. */
  pulse(): void;
  destroy(): void;
}

export function mountGlass(el: HTMLElement, initial: Appearance, { interactive = false } = {}): GlassController {
  let a = initial;
  const id = `fhp-lg-${Math.random().toString(36).slice(2, 8)}-${uid++}`;
  el.classList.add("lg");
  if (interactive) el.classList.add("lg-interactive");

  const warp = layer("lg-warp");
  const spec = layer("lg-spec");
  const svg = svgEl("svg", { class: "lg-layer lg-svg", "aria-hidden": "true" });
  const filter = svgEl("filter", {
    id, x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB"
  }, svgEl("defs", {}, svg));
  const mapImg = svgEl("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result: "MAP" }, filter);
  const maskImg = svgEl("feImage", { x: 0, y: 0, preserveAspectRatio: "none", result: "MASK" }, filter);
  const displace = (["R", "G", "B"] as const).map((ch) => {
    const node = svgEl("feDisplacementMap", {
      in: "SourceGraphic", in2: "MAP", xChannelSelector: "R", yChannelSelector: "B", result: `D${ch}`
    }, filter);
    svgEl("feColorMatrix", { in: `D${ch}`, type: "matrix", values: CHANNEL[ch], result: ch }, filter);
    return node;
  });
  svgEl("feBlend", { in: "G", in2: "B", mode: "screen", result: "GB" }, filter);
  svgEl("feBlend", { in: "R", in2: "GB", mode: "screen", result: "RGB" }, filter);
  svgEl("feComposite", { in: "RGB", in2: "MASK", operator: "in", result: "EDGE" }, filter);
  svgEl("feComposite", { in: "EDGE", in2: "DG", operator: "over" }, filter);
  el.prepend(warp, svg, spec, layer("lg-shine"));

  let built = "";
  let ready = false; // maps loaded and allowed by the page
  let maxScale = 0; // fold-free displacement for the current size
  let frame = 0;
  function setScales() {
    // Refraction is a % of the fold-free maximum. Green is the reference
    // channel; red and blue spread around it for chromatic aberration.
    // Never past the fold point (≈1.1× the fold-free scale), even mid-animation.
    const s = Math.min((a.refraction / 100) * boost, 1.1) * maxScale;
    const k = a.aberration * 0.04;
    [s * (1 - k), s, s * (1 + k)].forEach((v, i) => displace[i].setAttribute("scale", v.toFixed(2)));
  }
  async function rebuild() {
    frame = 0;
    // Layout size, not getBoundingClientRect: transforms would skew the map.
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const key = `${width}x${height}:${a.radius}:${a.depth}`;
    if (key === built) return;
    built = key;
    const maps = buildMaps(width, height, a.radius, a.depth);
    maxScale = foldFreeScale(bezelWidth(width, height, a.depth));
    setScales();
    ready = !!maps && (await canUseDataImages(maps.mask));
    if (!maps || !ready) {
      applyFilter();
      spec.style.backgroundImage = "";
      return;
    }
    for (const [img, href] of [[mapImg, maps.map], [maskImg, maps.mask]] as const) {
      img.setAttribute("href", href);
      img.setAttribute("width", String(maps.w));
      img.setAttribute("height", String(maps.h));
    }
    spec.style.backgroundImage = `url("${maps.spec}")`;
    applyFilter();
  }
  // The SVG filter goes inside backdrop-filter so its input is exactly the
  // backdrop. As a plain `filter` on the blurred element, Chrome feeds it
  // transparent pixels near the edges, which shows up as a grey band.
  function applyFilter() {
    const value = a.refraction > 0 && ready ? `url(#${id}) blur(var(--lg-blur)) saturate(var(--lg-sat))` : "";
    warp.style.backdropFilter = value;
    warp.style.setProperty("-webkit-backdrop-filter", value);
  }
  const schedule = () => (frame ||= requestAnimationFrame(rebuild));
  const resize = new ResizeObserver(schedule);
  resize.observe(el);

  // ── Live response ────────────────────────────────────────────────────────
  // Light angle follows the cursor; refraction "boost" eases toward a target
  // (1 at rest, 1.18 under the pointer, 0.1 → 1 on pulse). One rAF loop.
  let boost = 1;
  let boostTarget = 1;
  let angle = 315;
  let angleTarget = 315;
  let pointer: { x: number; y: number } | null = null;
  let tick = 0;
  const animating = () => a.motion && !matchMedia("(prefers-reduced-motion: reduce)").matches;

  function step() {
    tick = 0;
    const rect = pointer ? el.getBoundingClientRect() : null;
    if (rect && pointer) {
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      angleTarget = (Math.atan2(dx, -dy) * 180) / Math.PI;
      applyElastic(rect, dx, dy);
    }
    // Shortest way round the circle.
    const delta = ((angleTarget - angle + 540) % 360) - 180;
    angle = (angle + delta * 0.18 + 360) % 360;
    boost += (boostTarget - boost) * 0.14;
    el.style.setProperty("--lg-angle", `${angle.toFixed(1)}deg`);
    setScales();
    if (Math.abs(delta) > 0.3 || Math.abs(boostTarget - boost) > 0.004) tick = requestAnimationFrame(step);
  }
  const kick = () => (tick ||= requestAnimationFrame(step));

  function applyElastic(rect: DOMRect, dx: number, dy: number) {
    if (a.elasticity <= 0) return;
    const edge = Math.hypot(Math.max(0, Math.abs(dx) - rect.width / 2), Math.max(0, Math.abs(dy) - rect.height / 2));
    const fade = edge > 160 ? 0 : 1 - edge / 160;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist / 300, 1) * a.elasticity * fade;
    const nx = Math.abs(dx / dist);
    const ny = Math.abs(dy / dist);
    const s = el.style;
    s.setProperty("--lg-tx", `${(dx * a.elasticity * 0.06 * fade).toFixed(2)}px`);
    s.setProperty("--lg-ty", `${(dy * a.elasticity * 0.06 * fade).toFixed(2)}px`);
    s.setProperty("--lg-sx", (1 + nx * k * 0.2 - ny * k * 0.1).toFixed(4));
    s.setProperty("--lg-sy", (1 + ny * k * 0.2 - nx * k * 0.1).toFixed(4));
  }

  const onMove = (e: PointerEvent) => {
    if (el.dataset.lgPaused || !animating()) return;
    pointer = { x: e.clientX, y: e.clientY };
    kick();
  };
  const onEnter = () => { if (animating()) { boostTarget = 1.18; kick(); } };
  const onLeave = () => { boostTarget = 1; kick(); };
  window.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);

  function syncPointer() {
    if (a.elasticity > 0 && a.motion) return;
    for (const k of ["--lg-tx", "--lg-ty", "--lg-sx", "--lg-sy"]) el.style.removeProperty(k);
  }

  setScales();
  syncPointer();
  schedule();
  return {
    update(next) {
      a = next;
      setScales();
      syncPointer();
      applyFilter();
      schedule();
    },
    pulse() {
      if (!animating()) return;
      boost = 0.1;
      boostTarget = 1;
      kick();
    },
    destroy() {
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(tick);
    }
  };
}
