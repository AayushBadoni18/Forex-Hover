/**
 * popup.js — fallback converter window. The toolbar icon normally opens the
 * floating glass panel on the page (panel.js); Chrome blocks that on its own
 * pages, so the background opens this window there instead.
 */
import "./src/ui/backdrop.css";
import { normalizeAppearance } from "./src/ui/appearance.ts";
import { CONTROLS_CSS } from "./src/ui/controls.ts";
import { CONVERTER_CSS, createConverter } from "./src/ui/converter.ts";
import { h } from "./src/ui/dom.ts";
import { FLAG_CSS } from "./src/ui/flag.ts";
import { applyAppearance, GLASS_CSS } from "./src/ui/glass.ts";

document.head.append(h("style", {}, GLASS_CSS + CONTROLS_CSS + FLAG_CSS + CONVERTER_CSS));

(async () => {
  const { appearance: raw } = await chrome.storage.sync.get("appearance");
  let appearance = normalizeAppearance(raw);
  applyAppearance(document.documentElement, appearance);
  const converter = createConverter({ appearance, onOpenSettings: () => chrome.runtime.openOptionsPage() });
  document.getElementById("app").append(converter.root);
  converter.setAppearance(appearance);
  converter.focus();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.appearance) return;
    appearance = normalizeAppearance(changes.appearance.newValue);
    applyAppearance(document.documentElement, appearance);
    converter.setAppearance(appearance);
  });
})();
