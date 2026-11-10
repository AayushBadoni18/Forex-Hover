/**
 * options.js — Forex Hover Pro settings. Everything autosaves to
 * chrome.storage.sync; open tabs react through storage.onChanged.
 */
import "./src/ui/backdrop.css";
import { MAX_DOMAIN_OVERRIDES, MAX_TARGET_CURRENCIES } from "./src/shared/contracts.ts";
import { CURRENCIES, CURRENCY_BY_CODE, isCurrencyCode } from "./src/shared/currencies.ts";
import { ACCENTS, DEFAULT_APPEARANCE, MATERIALS, normalizeAppearance, PRESETS, RANGES, THEMES } from "./src/ui/appearance.ts";
import { h, prefersReducedMotion } from "./src/ui/dom.ts";
import { applyAppearance, GLASS_CSS, mountGlass } from "./src/ui/glass.ts";
import { buildResult, TOOLTIP_CSS } from "./src/ui/tooltip-view.ts";

document.head.append(h("style", {}, GLASS_CSS + TOOLTIP_CSS));
const $ = (id) => document.getElementById(id);

const SLIDERS = [
  ["displacement", "Refraction", "How strongly the edges bend what's behind.", (v) => `${v}`],
  ["blur", "Frost", "Backdrop blur.", (v) => `${v}px`],
  ["saturation", "Vibrancy", "Colour saturation seen through the glass.", (v) => `${v}%`],
  ["aberration", "Chromatic aberration", "Rainbow fringe on the bent edges.", (v) => `${v}`],
  ["elasticity", "Elasticity", "Liquid stretch toward your cursor.", (v) => v.toFixed(2)],
  ["radius", "Corner radius", "Roundness of every surface.", (v) => `${v}px`],
  ["tint", "Tint", "How opaque the glass is.", (v) => `${Math.round(v * 100)}%`],
  ["scale", "Tooltip size", "Scales the on-page tooltip.", (v) => `${v.toFixed(2)}×`]
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
  const t = $("toast");
  t.firstElementChild.lastChild.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
}
async function save(items) {
  await chrome.storage.sync.set(items);
  toast();
}
let appearanceTimer = 0;
function setAppearance(next, persist = true) {
  appearance = normalizeAppearance(next);
  applyAppearance(document.documentElement, appearance);
  glasses.forEach((g) => g.update(appearance));
  syncAppearanceControls();
  if (!persist) return;
  clearTimeout(appearanceTimer);
  appearanceTimer = setTimeout(() => save({ appearance }), 250);
}

// ─── Navigation ───────────────────────────────────────────────────────────
const navButtons = [...document.querySelectorAll("nav button[data-page]")];
function go(page) {
  navButtons.forEach((b) => b.removeAttribute("aria-current"));
  navButtons.find((b) => b.dataset.page === page)?.setAttribute("aria-current", "page");
  document.querySelectorAll("main > section").forEach((s) => {
    const show = s.id === `page-${page}`;
    s.hidden = !show;
    if (show) { s.classList.remove("enter"); void s.offsetWidth; s.classList.add("enter"); }
  });
  history.replaceState(null, "", `#${page}`);
}
navButtons.forEach((b) => b.addEventListener("click", () => go(b.dataset.page)));

// ─── Currencies ───────────────────────────────────────────────────────────
function renderCurrencies() {
  const q = $("filter").value.trim().toLowerCase();
  $("picked").replaceChildren(...targets.map((code) =>
    h("button", { class: "pill", title: `Remove ${code}`, "aria-label": `Remove ${code}`, onclick: () => toggleTarget(code) },
      `${CURRENCY_BY_CODE[code].flag} ${code}`, h("span", { "aria-hidden": "true" }, "✕"))
  ));
  $("pick-count").textContent = `${targets.length} of ${MAX_TARGET_CURRENCIES} selected · ${targets[0]} is home`;
  $("grid").replaceChildren(...CURRENCIES
    .filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    .map((c) => h("button", { class: "cur", "aria-pressed": String(targets.includes(c.code)), onclick: () => toggleTarget(c.code) },
      h("span", { class: "f" }, c.flag),
      h("span", { class: "t" }, h("b", {}, c.code), h("small", {}, c.name))
    )));
}
function toggleTarget(code) {
  if (targets.includes(code)) {
    if (targets.length === 1) return toast("Keep at least one currency");
    targets = targets.filter((c) => c !== code);
  } else {
    if (targets.length >= MAX_TARGET_CURRENCIES) return toast(`Up to ${MAX_TARGET_CURRENCIES} currencies`);
    targets = [...targets, code];
  }
  renderCurrencies();
  renderPreview();
  save({ targetCurrencies: targets, targetCurrency: targets[0] });
}
$("filter").addEventListener("input", renderCurrencies);

// ─── Appearance ───────────────────────────────────────────────────────────
function segmented(container, options, label, onPick) {
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", label);
  container.replaceChildren(...options.map((value) =>
    h("button", { "data-value": value, "aria-pressed": "false", onclick: () => onPick(value) }, value[0].toUpperCase() + value.slice(1))
  ));
}
function markPressed(container, value) {
  for (const b of container.children) b.setAttribute("aria-pressed", String(b.dataset.value === value));
}

segmented($("presets"), Object.keys(PRESETS), "Presets", (name) => {
  setAppearance({ ...DEFAULT_APPEARANCE, theme: appearance.theme, accent: appearance.accent, ...PRESETS[name] });
  markPressed($("presets"), name);
});
segmented($("theme"), THEMES, "Theme", (theme) => setAppearance({ ...appearance, theme }));
segmented($("material"), MATERIALS, "Material", (material) => setAppearance({ ...appearance, material }));
$("accent").replaceChildren(...ACCENTS.map((c) =>
  h("button", { "data-value": c, style: `--c:${c}`, "aria-label": `Accent ${c}`, "aria-pressed": "false", onclick: () => setAppearance({ ...appearance, accent: c }) })
));
$("sliders").replaceChildren(...SLIDERS.map(([key, title, help, fmt]) => {
  const [min, max, step] = RANGES[key];
  const id = `s-${key}`;
  const input = h("input", { type: "range", id, min, max, step });
  input.addEventListener("input", () => {
    $("presets").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
    setAppearance({ ...appearance, [key]: Number(input.value) });
  });
  return h("div", { class: "slider" },
    h("label", { for: id }, h("b", {}, title), h("small", {}, help)),
    h("output", { id: `${id}-out`, for: id }),
    input
  );
}));
for (const key of ["specular", "motion"]) $(key).addEventListener("change", (e) => setAppearance({ ...appearance, [key]: e.target.checked }));
$("reset").addEventListener("click", () => { setAppearance(DEFAULT_APPEARANCE); markPressed($("presets"), "Liquid"); });

function syncAppearanceControls() {
  markPressed($("theme"), appearance.theme);
  markPressed($("material"), appearance.material);
  markPressed($("accent"), appearance.accent);
  for (const [key, , , fmt] of SLIDERS) {
    const input = $(`s-${key}`);
    if (Number(input.value) !== appearance[key]) input.value = String(appearance[key]);
    $(`s-${key}-out`).textContent = fmt(appearance[key]);
  }
  $("specular").checked = appearance.specular;
  $("motion").checked = appearance.motion;
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
  const shown = targets.filter((c) => c !== "USD").slice(0, 4);
  const codes = shown.length ? shown : ["EUR", "GBP", "INR"];
  const rates = Object.fromEntries(codes.map((code) => {
    const live = liveRates?.rates?.[code];
    return [code, live?.success ? live : { success: true, rate: SAMPLE_RATES[code] ?? 1.5, timestamp: Date.now() }];
  }));
  $("preview-body").replaceChildren(...buildResult({
    amount: 249.99, originalCurrency: "USD", rates, source: liveRates?.source,
    instant: !appearance.motion || prefersReducedMotion()
  }));
}

// ─── Behavior ─────────────────────────────────────────────────────────────
const BEHAVIOR = { "pref-enabled": "enabled", "pref-selection": "selectionMode", "pref-underline": "underline" };
for (const [id, key] of Object.entries(BEHAVIOR)) $(id).addEventListener("change", (e) => save({ [key]: e.target.checked }));

// ─── Sites ────────────────────────────────────────────────────────────────
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
function normalizeDomain(input) {
  const raw = input.trim().toLowerCase();
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function renderSites() {
  const entries = Object.entries(overrides);
  $("sites").replaceChildren(...(entries.length ? entries.map(([domain, code]) =>
    h("div", { class: "site" },
      h("b", {}, domain),
      h("span", {}, `${CURRENCY_BY_CODE[code]?.flag ?? ""} ${code}`),
      h("button", { class: "btn", "aria-label": `Remove ${domain}`, onclick: () => { delete overrides[domain]; renderSites(); save({ domainOverrides: overrides }); } }, "Remove")
    )) : [h("div", { class: "hint", style: "padding:10px 0" }, "No site rules yet.")]));
}
$("site-currency").replaceChildren(...CURRENCIES.map((c) => h("option", { value: c.code }, `${c.flag}  ${c.code} — ${c.name}`)));
$("add-site").addEventListener("submit", (e) => {
  e.preventDefault();
  const domain = normalizeDomain($("site-domain").value);
  const code = $("site-currency").value;
  const err = $("site-error");
  err.hidden = true;
  if (!DOMAIN.test(domain)) return Object.assign(err, { hidden: false, textContent: "Enter a domain like amazon.ca" });
  if (!(domain in overrides) && Object.keys(overrides).length >= MAX_DOMAIN_OVERRIDES) {
    return Object.assign(err, { hidden: false, textContent: `Up to ${MAX_DOMAIN_OVERRIDES} site rules` });
  }
  overrides = { ...overrides, [domain]: code };
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
    overrides = Object.fromEntries(Object.entries(data.domainOverrides).filter(([d, c]) => DOMAIN.test(d) && isCurrencyCode(c)));
  }
  $("pref-enabled").checked = data.enabled !== false;
  $("pref-selection").checked = data.selectionMode !== false;
  $("pref-underline").checked = data.underline !== false;
  $("version").textContent = chrome.runtime.getManifest().version;

  setAppearance(data.appearance, false);
  glasses = [...document.querySelectorAll(".glass")].map((el) => mountGlass(el, appearance));
  glasses.push(mountGlass($("preview"), appearance));
  renderCurrencies();
  renderSites();
  renderPreview();
  loadPreviewRates();
  const page = location.hash.slice(1);
  if (navButtons.some((b) => b.dataset.page === page)) go(page);
})();
