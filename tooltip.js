/**
 * tooltip.js — Forex Hover Pro Liquid Glass tooltip.
 *
 * Shadow-DOM isolated; content is built with DOM nodes (never innerHTML).
 * Public API on window.ForexTooltip is unchanged for content.js.
 */
import { DEFAULT_APPEARANCE } from "./src/ui/appearance.ts";
import { h, prefersReducedMotion } from "./src/ui/dom.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";
import { buildResult, TOOLTIP_CSS } from "./src/ui/tooltip-view.ts";

window.ForexTooltip = (() => {
  let host = null;
  let root = null;
  let pop = null;
  let card = null;
  let body = null;
  let glass = null;
  let anchor = null;
  let hideTimer = null;
  let appearance = DEFAULT_APPEARANCE;

  function init() {
    if (host) return;
    host = document.createElement("div");
    host.setAttribute("data-fhp-host", "true");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(h("style", {}, GLASS_CSS + TOOLTIP_CSS));
    body = h("div");
    card = h("div", { class: "card", role: "status", "aria-live": "polite" }, body);
    pop = h("div", { class: "pop" }, card);
    root = h("div", { class: "root" }, pop);
    shadow.append(root);
    document.documentElement.appendChild(host);
    applyAppearance(root, onPage(appearance));
    glass = mountGlass(card, appearance);
    card.dataset.lgPaused = "1";
  }

  // Over arbitrary pages the tooltip needs more body than the panels do.
  const onPage = (a) => ({ ...a, tint: Math.min(0.85, a.tint + 0.35) });

  function setAppearance(next) {
    appearance = next;
    if (!root) return;
    applyAppearance(root, onPage(appearance));
    glass.update(appearance);
  }

  /** Auto theme: light glass over light page backgrounds (the reference's `overLight`). */
  function pageIsLight(anchorOrCoords) {
    let node = anchorOrCoords?.nodeType === Node.ELEMENT_NODE
      ? anchorOrCoords
      : document.elementFromPoint(anchorOrCoords.x, anchorOrCoords.y);
    for (; node; node = node.parentElement) {
      const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] === undefined || Number(m[3]) > 0.5)) {
        const [r, g, b] = m.map(Number);
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
      }
    }
    return true; // default canvas is white
  }

  function render(...nodes) {
    body.replaceChildren(...nodes);
    position();
  }

  function show(anchorOrCoords) {
    init();
    clearTimeout(hideTimer);
    anchor = anchorOrCoords;
    if (appearance.theme === "auto") root.dataset.theme = pageIsLight(anchorOrCoords) ? "light" : "dark";
    delete card.dataset.lgPaused;
    requestAnimationFrame(() => pop.classList.add("visible"));
  }

  function showLoading(anchorOrCoords) {
    show(anchorOrCoords);
    render(h("div", { class: "skel short" }), h("div", { class: "rows" }, h("div", { class: "skel" }), h("div", { class: "skel" })));
  }

  function showMultiResult(view) {
    if (!body) return;
    render(...buildResult({ ...view, instant: !appearance.motion || prefersReducedMotion() }));
  }

  function showError(message) {
    if (!body) return;
    render(h("div", { class: "err" }, `⚠︎ ${message}`));
  }

  function hide() {
    anchor = null;
    if (!pop) return;
    pop.classList.remove("visible");
    card.dataset.lgPaused = "1";
    hideTimer = setTimeout(() => body?.replaceChildren(), 260);
  }

  function position() {
    if (!root || !anchor) return;
    let top, bottom, left;
    if (anchor.nodeType === Node.ELEMENT_NODE) {
      const r = anchor.getBoundingClientRect();
      ({ top, bottom, left } = r);
    } else {
      top = anchor.y - 6;
      bottom = anchor.y + 6;
      left = anchor.x;
    }
    const size = pop.getBoundingClientRect();
    const w = size.width || 260;
    const hgt = size.height || 140;
    const GAP = 10;
    let y = bottom + GAP;
    const up = y + hgt > innerHeight - 8;
    if (up) y = top - hgt - GAP;
    pop.classList.toggle("up", up);
    const x = Math.max(8, Math.min(left, innerWidth - w - 8));
    root.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px)`;
  }

  function destroy() {
    glass?.destroy();
    host?.remove();
    host = root = pop = card = body = glass = anchor = null;
  }

  return { showLoading, showMultiResult, showError, hide, destroy, reposition: position, setAppearance };
})();
