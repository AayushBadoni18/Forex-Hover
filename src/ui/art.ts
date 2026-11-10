/**
 * Background art for the floating converter: the settings page's accent-driven
 * silk ribbons, built with DOM calls so it can live inside any web page.
 * Shown when "Background art" is on; otherwise the panel is see-through.
 */
import { h } from "./dom.ts";
import { s } from "./icons.ts";

export const ART_CSS = `
.panel-art { position: absolute; inset: 0; z-index: 0; border-radius: inherit; overflow: hidden; pointer-events: none; background: var(--canvas); }
.panel-art svg { width: 100%; height: 100%; display: block; }
.panel-art .glow { opacity: 0.6; }
[data-theme="light"] .panel-art .glow { opacity: 0.4; }
[data-wallpaper="off"] .panel-art { display: none; }
`;

let n = 0;
const stop = (offset: number, color: string, opacity = 1) =>
  s("stop", { offset, style: `stop-color:${color};stop-opacity:${opacity}` });

export function panelArt() {
  const id = `fhp-art-${n++}`;
  const mix = (other: string, pct = 55) => `color-mix(in srgb, var(--accent) ${pct}%, ${other})`;
  return h("div", { class: "panel-art", "aria-hidden": "true" },
    s("svg", { viewBox: "0 0 360 640", preserveAspectRatio: "xMidYMid slice" },
      s("defs", {},
        s("linearGradient", { id: `${id}-a`, x1: 0, y1: 0, x2: 1, y2: 0.25 },
          stop(0, "var(--accent)", 0), stop(0.35, "var(--accent)", 0.95), stop(0.75, mix("#bf5af2")), stop(1, mix("#ff375f", 40), 0.2)),
        s("linearGradient", { id: `${id}-b`, x1: 1, y1: 0, x2: 0, y2: 0.3 },
          stop(0, mix("#64d2ff", 50), 0.1), stop(0.5, mix("#64d2ff", 65)), stop(1, "var(--accent)", 0)),
        s("filter", { id: `${id}-soft`, x: "-40%", y: "-40%", width: "180%", height: "180%" }, s("feGaussianBlur", { stdDeviation: 40 }))
      ),
      s("g", { class: "glow", filter: `url(#${id}-soft)` },
        s("ellipse", { cx: 40, cy: 40, rx: 200, ry: 150, style: "fill:var(--accent)" }),
        s("ellipse", { cx: 340, cy: 330, rx: 170, ry: 170, style: `fill:${mix("#bf5af2", 50)}` }),
        s("ellipse", { cx: 80, cy: 620, rx: 220, ry: 140, style: `fill:${mix("#64d2ff", 50)}` })
      ),
      s("path", { d: "M-40 250 C 60 190, 160 330, 250 260 S 360 170, 420 220 L420 280 C 340 230, 270 340, 190 340 S 40 270, -40 330 Z", fill: `url(#${id}-a)` }),
      s("path", { d: "M420 470 C 320 520, 230 420, 140 480 S 20 560, -40 520 L-40 560 C 40 610, 150 540, 230 530 S 360 560, 420 520 Z", fill: `url(#${id}-b)` })
    )
  );
}
