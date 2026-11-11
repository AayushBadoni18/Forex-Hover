/**
 * panel.js — the converter as a floating Liquid Glass panel on the page.
 *
 * Chrome's toolbar popup is a separate, square, opaque window, so it can't be
 * rounded, dragged, or refract the page. Instead the toolbar icon toggles this
 * panel inside the page (closed shadow root), where the glass bends whatever
 * the site shows behind it. Drag it by the header; the position is remembered.
 */
import { normalizeDomain } from "./src/shared/currency-resolver.ts";
import { normalizeAppearance } from "./src/ui/appearance.ts";
import { ART_CSS, mountScene, panelArt } from "./src/ui/art.ts";
import { CONTROLS_CSS } from "./src/ui/controls.ts";
import { CONVERTER_CSS, createConverter } from "./src/ui/converter.ts";
import { h } from "./src/ui/dom.ts";
import { FLAG_CSS } from "./src/ui/flag.ts";
import { applyAppearance, GLASS_CSS } from "./src/ui/glass.ts";

(() => {
  // Injected on demand too (toolbar click on an older tab): never run twice.
  if (window.__fhpPanel) return;
  window.__fhpPanel = true;
  const WIDTH = 360;
  const MARGIN = 16;
  const PANEL_CSS = `
:host { all: initial; position: fixed; top: 0; left: 0; z-index: 2147483646; }
.shell {
  position: fixed; top: 0; left: 0; width: ${WIDTH}px; max-height: calc(100vh - ${MARGIN * 2}px);
  overflow-y: auto; overflow-x: hidden; border-radius: 28px; padding: 4px; scrollbar-width: none;
  opacity: 0; transform: translate(var(--x), var(--y)) scale(0.94);
  transform-origin: top right;
  transition: opacity 0.18s var(--ease), transform 0.4s cubic-bezier(0.2, 1.25, 0.35, 1);
}
.shell::-webkit-scrollbar { display: none; }
.shell.open { opacity: 1; transform: translate(var(--x), var(--y)); }
.shell.dragging { transition: none; }
.shell .bar { cursor: grab; touch-action: none; user-select: none; }
.shell.dragging .bar { cursor: grabbing; }
.shell .cv .sheet { border-radius: 24px; }
`;

  let host = null;
  let shell = null;
  let converter = null;
  let art = null;
  let appearance = normalizeAppearance(null);
  let pos = null;
  let anchored = true; // follows the top-right corner until the user drags it
  let lastFocus = null;

  function injectFont() {
    if (document.getElementById("fhp-font")) return;
    const font = document.createElement("style");
    font.id = "fhp-font";
    font.textContent = `@font-face{font-family:"FHP Inter";src:url("${chrome.runtime.getURL("fonts/inter.woff2")}") format("woff2");font-weight:100 900;font-display:swap}`;
    (document.head || document.documentElement).append(font);
  }

  /** Automatic theme: light glass over light pages, dark over dark (samples under the panel). */
  function pageIsLight() {
    const r = shell.getBoundingClientRect();
    const stack = document.elementsFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + 120));
    for (let node of stack) {
      if (node === host) continue;
      for (; node; node = node.parentElement) {
        const m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
        if (m && (m[3] === undefined || Number(m[3]) > 0.5)) {
          const [red, green, blue] = m.map(Number);
          return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.55;
        }
      }
      break;
    }
    return true;
  }

  function applyTheme() {
    const theme = appearance.theme === "auto" ? (pageIsLight() ? "light" : "dark") : appearance.theme;
    // The converter has its own background switch, separate from the settings page.
    applyAppearance(shell, { ...appearance, wallpaper: appearance.panelArt }, theme);
    mountScene(art, appearance.scene, "panel");
    converter.setAppearance(appearance);
  }

  function place(x, y) {
    const w = shell.offsetWidth || WIDTH;
    // Keep at least the header on screen.
    pos = {
      x: Math.round(Math.min(Math.max(x, 8 - w + 120), innerWidth - 120)),
      y: Math.round(Math.min(Math.max(y, 8), innerHeight - 60))
    };
    shell.style.setProperty("--x", `${pos.x}px`);
    shell.style.setProperty("--y", `${pos.y}px`);
  }

  function placeDefault() {
    place(innerWidth - (shell.offsetWidth || WIDTH) - MARGIN, MARGIN);
  }

  function enableDrag(handle) {
    let start = null;
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button, input, label, a")) return;
      start = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
      handle.setPointerCapture(e.pointerId);
      shell.classList.add("dragging");
    });
    handle.addEventListener("pointermove", (e) => {
      if (start) place(start.x + e.clientX - start.px, start.y + e.clientY - start.py);
    });
    const end = () => {
      if (!start) return;
      start = null;
      shell.classList.remove("dragging");
      anchored = false;
      chrome.storage.local.set({ panelPos: pos });
      if (appearance.theme === "auto") applyTheme();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  async function create() {
    injectFont();
    const [{ appearance: raw }, { panelPos }] = await Promise.all([
      chrome.storage.sync.get("appearance"),
      chrome.storage.local.get("panelPos")
    ]);
    appearance = normalizeAppearance(raw);
    host = document.createElement("div");
    host.setAttribute("data-fhp-host", "panel");
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(h("style", {}, GLASS_CSS + CONTROLS_CSS + FLAG_CSS + CONVERTER_CSS + ART_CSS + PANEL_CSS));
    converter = createConverter({
      appearance,
      onOpenSettings: () => chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }),
      onClose: () => close(),
      site: normalizeDomain(location.hostname) ?? undefined
    });
    // Background art sits behind the glass cards; with it off, the glass refracts the page itself.
    art = panelArt();
    shell = h("div", { class: "shell", role: "dialog", "aria-label": "Forex Hover converter" }, art, converter.root);
    shadow.append(shell);
    document.documentElement.append(host);
    const saved = panelPos && Number.isFinite(panelPos.x) && Number.isFinite(panelPos.y) ? panelPos : null;
    anchored = !saved;
    if (saved) place(saved.x, saved.y);
    else placeDefault();
    applyTheme();
    enableDrag(converter.handle);
    addEventListener("resize", () => (anchored ? placeDefault() : pos && place(pos.x, pos.y)));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.appearance && host) {
        appearance = normalizeAppearance(changes.appearance.newValue);
        applyTheme();
      }
    });
  }

  async function open() {
    lastFocus = document.activeElement;
    if (!host) await create();
    host.hidden = false;
    if (anchored) placeDefault();
    requestAnimationFrame(() => {
      shell.classList.add("open");
      converter.pulse();
      converter.focus();
    });
  }

  function close() {
    if (!shell) return;
    shell.classList.remove("open");
    setTimeout(() => {
      if (!shell.classList.contains("open")) host.hidden = true;
    }, 220);
    if (lastFocus?.focus) lastFocus.focus();
  }

  const isOpen = () => !!shell && shell.classList.contains("open");

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "TOGGLE_PANEL") return;
    if (isOpen()) close();
    else open();
    sendResponse({ ok: true });
  });
})();
