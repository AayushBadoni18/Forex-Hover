/**
 * options.js — Forex Hover Pro settings. Everything autosaves to
 * chrome.storage.sync; open tabs react through storage.onChanged.
 */
import "./src/ui/backdrop.css";
import { MAX_DOMAIN_OVERRIDES, MAX_TARGET_CURRENCIES } from "./src/shared/contracts.ts";
import { CURRENCIES, CURRENCY_BY_CODE, isCurrencyCode } from "./src/shared/currencies.ts";
import { normalizeDomain } from "./src/shared/currency-resolver.ts";
import { ACCENTS, DEFAULT_APPEARANCE, normalizeAppearance, PRESETS, RANGES, THEMES } from "./src/ui/appearance.ts";
import { h } from "./src/ui/dom.ts";
import { flag } from "./src/ui/flag.ts";
import { CONTROLS_CSS } from "./src/ui/controls.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";
import { addPlate, buildResult, TOOLTIP_CSS } from "./src/ui/tooltip-view.ts";

document.head.append(h("style", {}, GLASS_CSS + CONTROLS_CSS + TOOLTIP_CSS));
const $ = (id) => document.getElementById(id);

const SLIDERS = [
  ["refraction", "Refraction", "How strongly the edge bends what's behind it. Above 100% the image starts to fold.", (v) => `${v}%`],
  ["depth", "Lens depth", "How far the curved edge reaches inward.", (v) => `${Math.round(v * 100)}%`],
  ["blur", "Frost", "Blur of the background seen through the glass.", (v) => `${v}px`],
  ["tint", "Tint", "How opaque the glass is.", (v) => `${Math.round(v * 100)}%`],
  ["specular", "Highlight", "Brightness of the light catching the rim.", (v) => `${Math.round(v * 100)}%`],
  ["aberration", "Chromatic aberration", "Colour fringing where light bends.", (v) => v.toFixed(2)],
  ["saturation", "Vibrancy", "Colour saturation through the glass.", (v) => `${v}%`],
  ["radius", "Corner radius", "Roundness of the glass.", (v) => `${v}px`],
  ["elasticity", "Elasticity", "Stretch toward the cursor. Off for a calmer feel.", (v) => (v ? v.toFixed(2) : "Off")],
  ["scale", "Tooltip size", "Scales the tooltip on web pages.", (v) => `${Math.round(v * 100)}%`]
];
const SAMPLE_RATES = { EUR: 0.92, GBP: 0.79, INR: 84.1, JPY: 151.3, CAD: 1.37, AUD: 1.52 };

let appearance = DEFAULT_APPEARANCE;
let targets = ["USD", "EUR", "GBP"];
let overrides = {};
let glasses = [];
let liveRates = null;

// ─── Save + toast ─────────────────────────────────────────────────────────
let toastTimer = 0;
function toast(text = "Saved") {
  $("toast-text").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1300);
}
async function save(items, message) {
  await chrome.storage.sync.set(items);
  toast(message);
}
let appearanceTimer = 0;
function setAppearance(next, persist = true) {
  appearance = normalizeAppearance(next);
  applyAppearance(document.documentElement, appearance);
  glasses.forEach((g) => g.update(appearance));
  syncAppearanceControls();
  if (!persist) return;
  clearTimeout(appearanceTimer);
  appearanceTimer = setTimeout(() => save({ appearance }), 300);
}

// ─── Navigation ───────────────────────────────────────────────────────────
const navButtons = [...document.querySelectorAll("nav button[data-page]")];
function go(page) {
  navButtons.forEach((b) => b.toggleAttribute("aria-current", false));
  navButtons.find((b) => b.dataset.page === page)?.setAttribute("aria-current", "page");
  document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== `page-${page}`));
  history.replaceState(null, "", `#${page}`);
  scrollTo(0, 0);
}
navButtons.forEach((b) => b.addEventListener("click", () => go(b.dataset.page)));
addEventListener("hashchange", () => {
  const page = location.hash.slice(1);
  if (navButtons.some((b) => b.dataset.page === page)) go(page);
});

// ─── Currencies ───────────────────────────────────────────────────────────
function saveTargets() {
  renderCurrencies();
  renderPreview();
  save({ targetCurrencies: targets, targetCurrency: targets[0] });
}
function renderCurrencies() {
  $("picked-title").textContent = `Selected (${targets.length} of ${MAX_TARGET_CURRENCIES})`;
  $("picked").replaceChildren(...targets.map((code, i) =>
    h("div", { class: "row" },
      flag(code),
      h("span", { class: "code" }, code),
      h("span", { class: "text muted" }, CURRENCY_BY_CODE[code].name),
      i === 0
        ? h("span", { class: "home" }, "Home")
        : h("button", { class: "mini", onclick: () => { targets = [code, ...targets.filter((c) => c !== code)]; saveTargets(); } }, "Make Home"),
      h("button", {
        class: "remove", "aria-label": `Remove ${code}`, title: "Remove", disabled: targets.length === 1,
        onclick: () => { targets = targets.filter((c) => c !== code); saveTargets(); }
      }, "−")
    )
  ));
  const q = $("filter").value.trim().toLowerCase();
  const rest = CURRENCIES.filter((c) => !targets.includes(c.code) && (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
  $("all").replaceChildren(...(rest.length ? rest.map((c) =>
    h("button", {
      class: "row",
      onclick: () => {
        if (targets.length >= MAX_TARGET_CURRENCIES) return toast(`Up to ${MAX_TARGET_CURRENCIES} currencies`);
        targets = [...targets, c.code];
        saveTargets();
      }
    }, flag(c.code), h("span", { class: "code" }, c.code), h("span", { class: "text muted" }, c.name), h("span", { class: "check", "aria-hidden": "true" }, "+"))
  ) : [h("div", { class: "row muted" }, "No matches")]));
}
$("filter").addEventListener("input", renderCurrencies);

// ─── Appearance ───────────────────────────────────────────────────────────
function segmented(container, options, label, onPick, text = (v) => v[0].toUpperCase() + v.slice(1)) {
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", label);
  container.replaceChildren(...options.map((value) =>
    h("button", { "data-value": value, "aria-pressed": "false", onclick: () => onPick(value) }, text(value))
  ));
}
const markPressed = (container, value) => {
  for (const b of container.children) b.setAttribute("aria-pressed", String(b.dataset.value === value));
};
const matchingPreset = () => Object.keys(PRESETS).find((name) =>
  Object.entries({ ...DEFAULT_APPEARANCE, ...PRESETS[name] }).every(([k, v]) => ["theme", "accent", "motion", "radius", "scale", "elasticity", "wallpaper", "liquid"].includes(k) || appearance[k] === v)
);

segmented($("presets"), Object.keys(PRESETS), "Material", (name) => {
  const { theme, accent, motion, radius, scale, elasticity, wallpaper, liquid } = appearance;
  const keep = { theme, accent, motion, radius, scale, elasticity, wallpaper, liquid };
  setAppearance({ ...DEFAULT_APPEARANCE, ...PRESETS[name], ...keep });
});
segmented($("theme"), THEMES, "Theme", (theme) => setAppearance({ ...appearance, theme }), (v) => ({ auto: "Automatic", light: "Light", dark: "Dark" })[v]);
$("accent").replaceChildren(...ACCENTS.map((c) =>
  h("button", { "data-value": c, style: `--c:${c}`, "aria-label": `Accent ${c}`, "aria-pressed": "false", onclick: () => setAppearance({ ...appearance, accent: c }) })
));
$("sliders").replaceChildren(...SLIDERS.map(([key, title, help]) => {
  const [min, max, step] = RANGES[key];
  const id = `s-${key}`;
  const input = h("input", { type: "range", id, min, max, step });
  input.addEventListener("input", () => setAppearance({ ...appearance, [key]: Number(input.value) }));
  return h("div", { class: "row" },
    h("label", { class: "text", for: id }, h("b", {}, title), h("small", {}, help)),
    h("div", { class: "slider-ctl" }, input, h("output", { id: `${id}-out`, for: id }))
  );
}));
for (const key of ["motion", "wallpaper", "liquid"]) {
  $(key).addEventListener("change", (e) => setAppearance({ ...appearance, [key]: e.target.checked }));
}
$("reset").addEventListener("click", () => setAppearance(DEFAULT_APPEARANCE));

function syncAppearanceControls() {
  markPressed($("presets"), matchingPreset());
  markPressed($("theme"), appearance.theme);
  markPressed($("accent"), appearance.accent);
  for (const [key, , , fmt] of SLIDERS) {
    const input = $(`s-${key}`);
    if (Number(input.value) !== appearance[key]) input.value = String(appearance[key]);
    $(`s-${key}-out`).textContent = fmt(appearance[key]);
  }
  for (const key of ["motion", "wallpaper", "liquid"]) $(key).checked = appearance[key];
}

async function loadPreviewRates() {
  try {
    const list = targets.filter((c) => c !== "USD").slice(0, MAX_TARGET_CURRENCIES);
    if (!list.length) return;
    const res = await chrome.runtime.sendMessage({ type: "GET_RATES_MULTI", base: "USD", targets: list });
    if (res?.success) liveRates = res;
  } catch {}
  renderPreview();
}
function renderPreview() {
  const shown = targets.filter((c) => c !== "USD").slice(0, 3);
  const codes = shown.length ? shown : ["EUR", "GBP", "INR"];
  const rates = Object.fromEntries(codes.map((code) => {
    const live = liveRates?.rates?.[code];
    return [code, live?.success ? live : { success: true, rate: SAMPLE_RATES[code] ?? 1.5, timestamp: Date.now() }];
  }));
  $("preview-body").replaceChildren(...buildResult({ amount: 249.99, originalCurrency: "USD", rates, source: liveRates?.source }));
}

// Drag the preview card around the stage.
(() => {
  const wrap = $("preview-wrap");
  const stage = $("stage");
  let start = null;
  wrap.addEventListener("pointerdown", (e) => {
    start = { x: e.clientX, y: e.clientY, left: wrap.offsetLeft, top: wrap.offsetTop };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!start) return;
    const zoom = appearance.scale;
    const maxX = stage.clientWidth / zoom - wrap.offsetWidth;
    const maxY = stage.clientHeight / zoom - wrap.offsetHeight;
    wrap.style.left = `${Math.max(-40, Math.min(maxX + 40, start.left + (e.clientX - start.x) / zoom))}px`;
    wrap.style.top = `${Math.max(-40, Math.min(maxY + 40, start.top + (e.clientY - start.y) / zoom))}px`;
  });
  const end = () => (start = null);
  wrap.addEventListener("pointerup", end);
  wrap.addEventListener("pointercancel", end);
})();

// ─── Behavior ─────────────────────────────────────────────────────────────
const BEHAVIOR = { "pref-enabled": "enabled", "pref-selection": "selectionMode", "pref-underline": "underline" };
for (const [id, key] of Object.entries(BEHAVIOR)) $(id).addEventListener("change", (e) => save({ [key]: e.target.checked }));

// ─── Sites ────────────────────────────────────────────────────────────────
function domainFromInput(input) {
  const raw = input.trim().toLowerCase();
  try {
    return normalizeDomain(new URL(raw.includes("://") ? raw : `https://${raw}`).hostname);
  } catch {
    return null;
  }
}
function renderSites() {
  const entries = Object.entries(overrides);
  $("sites").replaceChildren(...(entries.length ? entries.map(([domain, code]) =>
    h("div", { class: "row" },
      h("span", { class: "text mono" }, domain),
      flag(code),
      h("span", { class: "code" }, code),
      h("button", {
        class: "remove", "aria-label": `Remove ${domain}`, title: "Remove",
        onclick: () => { const { [domain]: _, ...rest } = overrides; overrides = rest; renderSites(); save({ domainOverrides: overrides }); }
      }, "−")
    )) : [h("div", { class: "row muted" }, "No site rules yet.")]));
}
$("site-currency").replaceChildren(...CURRENCIES.map((c) => h("option", { value: c.code }, `${c.code} — ${c.name}`)));
$("add-site").addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = domainFromInput($("site-domain").value);
  const err = $("site-error");
  err.hidden = true;
  if (!domain) return Object.assign(err, { hidden: false, textContent: "Enter a site like amazon.ca" });
  if (!(domain in overrides) && Object.keys(overrides).length >= MAX_DOMAIN_OVERRIDES) {
    return Object.assign(err, { hidden: false, textContent: `Up to ${MAX_DOMAIN_OVERRIDES} site rules` });
  }
  overrides = { ...overrides, [domain]: $("site-currency").value };
  $("site-domain").value = "";
  renderSites();
  save({ domainOverrides: overrides });
});

// ─── Boot ─────────────────────────────────────────────────────────────────
(async () => {
  const data = await chrome.storage.sync.get([
    "targetCurrencies", "targetCurrency", "domainOverrides", "enabled", "selectionMode", "underline", "appearance"
  ]);
  const saved = Array.isArray(data.targetCurrencies) ? data.targetCurrencies.filter(isCurrencyCode).slice(0, MAX_TARGET_CURRENCIES) : [];
  if (saved.length) targets = [...new Set(saved)];
  else if (isCurrencyCode(data.targetCurrency)) targets = [data.targetCurrency];
  if (data.domainOverrides && typeof data.domainOverrides === "object") {
    overrides = Object.fromEntries(Object.entries(data.domainOverrides).filter(([d, c]) => normalizeDomain(d) === d && isCurrencyCode(c)));
  }
  $("pref-enabled").checked = data.enabled !== false;
  $("pref-selection").checked = data.selectionMode !== false;
  $("pref-underline").checked = data.underline !== false;
  $("version").textContent = chrome.runtime.getManifest().version;

  setAppearance(data.appearance, false);
  glasses = [...document.querySelectorAll(".glass")].map((el) => mountGlass(el, appearance, { bezel: 26 }));
  glasses.push(mountGlass($("preview"), appearance, { bezel: 24 }));
  addPlate($("preview"));
  renderCurrencies();
  renderSites();
  renderPreview();
  loadPreviewRates();
  const page = location.hash.slice(1);
  if (navButtons.some((b) => b.dataset.page === page)) go(page);
})();
