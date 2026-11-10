/**
 * Vanilla Liquid Glass engine.
 *
 * Technique ported from liquid-glass-react (MIT, © 2025 Max Rovensky,
 * https://github.com/rdev/liquid-glass-react): an SVG feDisplacementMap filter
 * with per-channel chromatic aberration bends the backdrop at the edges,
 * two masked rim layers catch a cursor-following highlight, and the surface
 * stretches elastically toward the pointer. Differences: the displacement map
 * is generated per element from a rounded-rect SDF instead of shipped as a
 * bitmap, and all per-frame updates are CSS custom properties (no re-render).
 */
import { resolveTheme, type Appearance } from "./appearance.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
let uid = 0;

export const GLASS_CSS = `
[data-theme] {
  --lg-tint: rgba(18, 20, 28, var(--lg-tint-a));
  --fg: rgba(255, 255, 255, 0.96);
  --fg-2: rgba(235, 240, 255, 0.68);
  --fg-3: rgba(235, 240, 255, 0.42);
  --hairline: rgba(255, 255, 255, 0.12);
  --fill: rgba(255, 255, 255, 0.08);
  --fill-2: rgba(255, 255, 255, 0.14);
  --shadow: 0 16px 48px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25);
  --text-shadow: 0 1px 10px rgba(0, 0, 0, 0.35);
  --accent-text: var(--accent);
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}
[data-theme="light"] {
  --lg-tint: rgba(255, 255, 255, var(--lg-tint-a));
  --fg: rgba(10, 12, 20, 0.92);
  --fg-2: rgba(30, 35, 50, 0.62);
  --fg-3: rgba(30, 35, 50, 0.4);
  --hairline: rgba(0, 0, 0, 0.08);
  --fill: rgba(0, 0, 0, 0.045);
  --fill-2: rgba(0, 0, 0, 0.08);
  --shadow: 0 16px 48px rgba(20, 30, 60, 0.18), 0 2px 8px rgba(20, 30, 60, 0.08);
  --text-shadow: none;
  --accent-text: color-mix(in srgb, var(--accent) 62%, #000);
}
.lg {
  position: relative;
  isolation: isolate;
  border-radius: var(--lg-radius);
  box-shadow: var(--shadow);
  transform: translate(var(--lg-tx, 0px), var(--lg-ty, 0px)) scale(var(--lg-sx, 1), var(--lg-sy, 1)) scale(var(--lg-press, 1));
  transition: transform 0.35s var(--spring), box-shadow 0.3s var(--ease);
  text-shadow: var(--text-shadow);
}
.lg > :not(.lg-layer) { position: relative; z-index: 2; }
.lg-layer { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.lg-svg { width: 0; height: 0; position: absolute; overflow: hidden; }
.lg-warp {
  z-index: 0;
  overflow: hidden;
  background: var(--lg-tint);
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
  -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat));
}
.lg-rim {
  z-index: 1;
  padding: 1.5px;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35);
  --a1: calc(var(--rim-1) + var(--lg-ax, 0) * 0.008);
  --a2: calc(var(--rim-2) + var(--lg-ax, 0) * 0.012);
  background: linear-gradient(
    calc(135deg + var(--lg-mx, 0) * 1.2deg),
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, var(--a1)) max(10%, calc(33% + var(--lg-my, 0) * 0.3%)),
    rgba(255, 255, 255, var(--a2)) min(90%, calc(66% + var(--lg-my, 0) * 0.4%)),
    rgba(255, 255, 255, 0) 100%
  );
}
.lg-rim-a { --rim-1: 0.12; --rim-2: 0.4; mix-blend-mode: screen; opacity: 0.2; }
.lg-rim-b { --rim-1: 0.32; --rim-2: 0.6; mix-blend-mode: overlay; }
[data-theme="light"] .lg-rim-b { mix-blend-mode: soft-light; opacity: 0.8; }
.lg-shine {
  z-index: 1;
  opacity: 0;
  mix-blend-mode: overlay;
  background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 70%);
  transition: opacity 0.25s var(--ease);
}
.lg-interactive { cursor: pointer; }
.lg-interactive:hover > .lg-shine { opacity: 0.45; }
.lg-interactive:active { --lg-press: 0.96; }
.lg-interactive:active > .lg-shine { opacity: 0.85; }
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
export function applyAppearance(root: HTMLElement, a: Appearance) {
  root.dataset.theme = resolveTheme(a.theme);
  root.dataset.motion = a.motion ? "on" : "off";
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--lg-blur", `${a.blur}px`);
  set("--lg-sat", `${a.saturation}%`);
  set("--lg-radius", `${a.radius}px`);
  set("--lg-tint-a", String(a.tint));
  set("--accent", a.accent);
  set("--ui-scale", String(a.scale));
}

function sdRoundRect(x: number, y: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

/**
 * Builds the displacement map (R = x, G/B = y, 0.5 = neutral) and an edge
 * mask (alpha = bend strength) for a w×h rounded rect. Displacement always
 * points inward so the filter never samples outside the element.
 */
export function buildMaps(w: number, h: number, radius: number, material: Appearance["material"]) {
  w = Math.round(w);
  h = Math.round(h);
  if (material === "frost" || w < 8 || h < 8) return null;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const bezel = material === "prominent" ? Math.min(48, Math.min(w, h) / 2) : Math.min(26, Math.min(w, h) / 3);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const map = ctx.createImageData(w, h);
  const mask = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const d = sdRoundRect(px, py, hw, hh, r);
      let dx = 0;
      let dy = 0;
      let mag = 0;
      if (d <= 0) {
        if (material === "polar") {
          const nx = px / hw;
          const ny = py / hh;
          const len = Math.hypot(nx, ny) || 1;
          const t = Math.min(1, Math.max(0, (len - 0.25) / 0.75));
          mag = t * t * (3 - 2 * t);
          dx = (-nx / len) * mag;
          dy = (-ny / len) * mag;
        } else {
          const t = Math.min(1, Math.max(0, 1 + d / bezel));
          mag = material === "prominent" ? t * t * (3 - 2 * t) : t * t;
          if (mag > 0) {
            const gx = sdRoundRect(px + 1, py, hw, hh, r) - sdRoundRect(px - 1, py, hw, hh, r);
            const gy = sdRoundRect(px, py + 1, hw, hh, r) - sdRoundRect(px, py - 1, hw, hh, r);
            const gl = Math.hypot(gx, gy) || 1;
            dx = (-gx / gl) * mag;
            dy = (-gy / gl) * mag;
          }
        }
      }
      const i = (y * w + x) * 4;
      map.data[i] = 128 + 127 * dx;
      map.data[i + 1] = map.data[i + 2] = 128 + 127 * dy;
      map.data[i + 3] = 255;
      mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 255;
      mask.data[i + 3] = 255 * mag;
    }
  }
  ctx.putImageData(map, 0, 0);
  const mapUrl = canvas.toDataURL();
  ctx.putImageData(mask, 0, 0);
  return { map: mapUrl, mask: canvas.toDataURL(), w, h };
}

// Pages with a strict img-src CSP block data: feImages. A failed map would
// shift the whole backdrop, so probe once and fall back to plain frost.
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
  destroy(): void;
}

export function mountGlass(el: HTMLElement, initial: Appearance, { interactive = false } = {}): GlassController {
  let a = initial;
  const id = `fhp-lg-${Math.random().toString(36).slice(2, 8)}-${uid++}`;
  el.classList.add("lg");
  if (interactive) el.classList.add("lg-interactive");

  const warp = layer("lg-warp");
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
  el.prepend(warp, svg, layer("lg-rim lg-rim-a"), layer("lg-rim lg-rim-b"), layer("lg-shine"));

  let built = "";
  let frame = 0;
  function setScales() {
    const s = a.displacement;
    displace.forEach((node, i) => node.setAttribute("scale", String(s * (1 + a.aberration * 0.05 * i))));
  }
  async function rebuild() {
    frame = 0;
    // Layout size, not getBoundingClientRect: the elastic transform would skew the map.
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const key = `${Math.round(width / 2)}x${Math.round(height / 2)}:${a.radius}:${a.material}:${a.displacement > 0}`;
    if (key === built) return;
    built = key;
    const maps = a.displacement > 0 ? buildMaps(width, height, a.radius, a.material) : null;
    if (!maps || !(await canUseDataImages(maps.mask))) {
      warp.style.filter = "";
      return;
    }
    for (const [img, href] of [[mapImg, maps.map], [maskImg, maps.mask]] as const) {
      img.setAttribute("href", href);
      img.setAttribute("width", String(maps.w));
      img.setAttribute("height", String(maps.h));
    }
    warp.style.filter = `url(#${id})`;
  }
  const schedule = () => (frame ||= requestAnimationFrame(rebuild));
  const resize = new ResizeObserver(schedule);
  resize.observe(el);

  // Pointer → CSS vars: rim highlight angle and elastic stretch (reference formulas).
  let pointer: { x: number; y: number } | null = null;
  let moveFrame = 0;
  function applyPointer() {
    moveFrame = 0;
    if (!pointer) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const s = el.style;
    if (a.specular) {
      const mx = ((pointer.x - cx) / rect.width) * 100;
      const my = ((pointer.y - cy) / rect.height) * 100;
      s.setProperty("--lg-mx", mx.toFixed(1));
      s.setProperty("--lg-my", my.toFixed(1));
      s.setProperty("--lg-ax", Math.abs(mx).toFixed(1));
    }
    if (!a.motion || a.elasticity <= 0) return;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const edge = Math.hypot(Math.max(0, Math.abs(dx) - rect.width / 2), Math.max(0, Math.abs(dy) - rect.height / 2));
    const fade = edge > 200 ? 0 : 1 - edge / 200;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(dist / 300, 1) * a.elasticity * fade;
    const nx = Math.abs(dx / dist);
    const ny = Math.abs(dy / dist);
    s.setProperty("--lg-tx", `${(dx * a.elasticity * 0.1 * fade).toFixed(2)}px`);
    s.setProperty("--lg-ty", `${(dy * a.elasticity * 0.1 * fade).toFixed(2)}px`);
    s.setProperty("--lg-sx", Math.max(0.8, 1 + nx * k * 0.3 - ny * k * 0.15).toFixed(4));
    s.setProperty("--lg-sy", Math.max(0.8, 1 + ny * k * 0.3 - nx * k * 0.15).toFixed(4));
  }
  const onMove = (e: PointerEvent) => {
    if (el.dataset.lgPaused) return;
    pointer = { x: e.clientX, y: e.clientY };
    moveFrame ||= requestAnimationFrame(applyPointer);
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  function resetPointerVars() {
    for (const k of ["--lg-mx", "--lg-my", "--lg-ax", "--lg-tx", "--lg-ty", "--lg-sx", "--lg-sy"]) el.style.removeProperty(k);
  }

  setScales();
  schedule();
  return {
    update(next) {
      a = next;
      setScales();
      if (!a.specular || !a.motion || a.elasticity <= 0) resetPointerVars();
      schedule(); // rebuilds the map only if size, radius, material or on/off changed
    },
    destroy() {
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(moveFrame);
    }
  };
}
