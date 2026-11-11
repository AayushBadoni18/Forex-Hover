/**
 * tooltip.js — Forex Hover Pro Liquid Glass tooltip.
 *
 * Shadow-DOM isolated; content is built with DOM nodes (never innerHTML).
 * Public API on window.ForexTooltip is unchanged for content.js.
 */
import { DEFAULT_APPEARANCE } from "./src/ui/appearance.ts";
import { h } from "./src/ui/dom.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";
import { addPlate, buildLoading, buildResult, TOOLTIP_CSS } from "./src/ui/tooltip-view.ts";

window.ForexTooltip ??= (() => {
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
    // @font-face is ignored inside shadow roots, so declare the bundled font on the page.
    const font = document.getElementById("fhp-font") ? null : document.createElement("style");
    if (font) font.id = "fhp-font";
    if (font) font.textContent = `@font-face{font-family:"FHP Inter";src:url("${chrome.runtime.getURL("fonts/inter.woff2")}") format("woff2");font-weight:100 900;font-display:swap}`;
    if (font) (document.head || document.documentElement).append(font);
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(h("style", {}, GLASS_CSS + TOOLTIP_CSS));
    body = h("div");
    card = h("div", { class: "tt-card", role: "status", "aria-live": "polite" }, body);
    pop = h("div", { class: "pop" }, card);
    root = h("div", { class: "root" }, pop);
    shadow.append(root);
    document.documentElement.appendChild(host);
    applyAppearance(root, appearance);
    glass = mountGlass(card, appearance, { bezel: 24 });
    addPlate(card);
    // The card morphs height between states; re-place it once it settles.
    card.addEventListener("transitionend", (e) => e.propertyName === "height" && position());
    card.dataset.lgPaused = "1";
  }

  function setAppearance(next) {
    appearance = next;
    if (!root) return;
    applyAppearance(root, appearance);
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
    if (!pop.classList.contains("visible")) glass.pulse();
    requestAnimationFrame(() => pop.classList.add("visible"));
  }

  function showLoading(anchorOrCoords) {
    show(anchorOrCoords);
    render(...buildLoading());
  }

  function showMultiResult(view) {
    show(view.anchor);
    render(...buildResult(view));
  }

  function showError(message, anchorOrCoords) {
    show(anchorOrCoords);
    render(h("div", { class: "tt-err" }, message));
  }

  function hide() {
    anchor = null;
    if (!pop) return;
    pop.classList.remove("visible");
    card.dataset.lgPaused = "1";
    hideTimer = setTimeout(() => body?.replaceChildren(), 160);
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
