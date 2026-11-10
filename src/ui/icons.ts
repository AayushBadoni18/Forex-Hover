/** SVG icons built with DOM calls (no HTML parsing), safe on pages with strict CSP/Trusted Types. */
const NS = "http://www.w3.org/2000/svg";

type Child = SVGElement | string;
export function s(tag: string, attrs: Record<string, string | number> = {}, ...children: Child[]): SVGElement {
  const el = document.createElementNS(NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const stroke = (size: number, box: number, paths: string[], width = 1.7) =>
  s("svg", { width: size, height: size, viewBox: `0 0 ${box} ${box}`, fill: "none", stroke: "currentColor", "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
    ...paths.map((d) => s("path", { d })));

let logoId = 0;
/** Brand mark: two exchange arrows around a currency sign, no background. */
export function logo(cls = "logo") {
  const id = `fhp-logo-${logoId++}`;
  return s("svg", { class: cls, viewBox: "0 0 32 32", "aria-hidden": "true" },
    s("defs", {}, s("linearGradient", { id, x1: 0, y1: 0, x2: 1, y2: 1 },
      s("stop", { offset: 0, "stop-color": "#0a84ff" }), s("stop", { offset: 1, "stop-color": "#30d158" }))),
    s("g", { fill: "none", stroke: `url(#${id})`, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" },
      s("path", { d: "M6.5 13.5A9.8 9.8 0 0 1 23.6 8" }), s("path", { d: "M24.4 3.6v4.8h-4.8" }),
      s("path", { d: "M25.5 18.5A9.8 9.8 0 0 1 8.4 24" }), s("path", { d: "M7.6 28.4v-4.8h4.8" })),
    s("text", { x: 16, y: 20.2, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "currentColor" }, "¤"));
}

export const gear = () => stroke(18, 24, [
  "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
], 1.6);
export const swapIcon = () => stroke(14, 14, ["M4 2v10M1.5 4.5 4 2l2.5 2.5M10 12V2M7.5 9.5 10 12l2.5-2.5"], 1.6);
export const chevron = () => stroke(10, 10, ["m2.5 4 2.5 2.5L7.5 4"], 1.6);
export const close = () => stroke(14, 14, ["M3.5 3.5l7 7M10.5 3.5l-7 7"], 1.8);
