/**
 * background.js — Forex Hover Pro service worker.
 *
 * Keyless rates: one validated snapshot, cached in chrome.storage.local,
 * deduplicated in flight, stale-but-labelled offline. Every pair is derived
 * from it, so a currency seen for the first time needs no new request.
 */
import { parseQuery } from "./src/shared/calc.ts";
import { isCurrencyCode } from "./src/shared/currencies.ts";
import { currencyForLocale } from "./src/shared/currency-resolver.ts";
import { formatMoney } from "./src/shared/format.ts";
import { createRateCache, fetchHistoricalRates } from "./src/shared/rates.ts";
import { isRuntimeMessage } from "./src/shared/validate.ts";

const getSnapshot = createRateCache(chrome.storage.local);

const PIVOT = "USD";

// Rates from a week ago, for the "this week" trend. Never blocks a conversion:
// the cached copy answers, and a missing or outdated one is fetched for next time.
const HISTORY_KEY = "history_week";
let historyTried = "";
async function getWeekAgo() {
  const date = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const cached = (await chrome.storage.local.get(HISTORY_KEY))[HISTORY_KEY];
  if (cached?.date !== date && historyTried !== date) {
    historyTried = date;
    fetchHistoricalRates(date).then((rates) => chrome.storage.local.set({ [HISTORY_KEY]: { date, rates } })).catch(() => {});
  }
  return cached?.rates && typeof cached.rates === "object" ? cached.rates : null;
}

async function getRates(base, targets) {
  const [{ snapshot, stale }, old] = await Promise.all([getSnapshot(PIVOT), getWeekAgo().catch(() => null)]);
  const perBase = snapshot.rates[base];
  const rates = {};
  for (const target of targets) {
    const rate = perBase && snapshot.rates[target] ? snapshot.rates[target] / perBase : 0;
    const before = old?.[base] > 0 && old?.[target] > 0 ? old[target] / old[base] : 0;
    rates[target] = rate
      ? { success: true, rate, timestamp: snapshot.fetchedAt, stale, change: before ? rate / before - 1 : undefined }
      : { success: false, error: "UNSUPPORTED_CURRENCY" };
  }
  return { rates, source: snapshot.source, stale, timestamp: snapshot.fetchedAt };
}

// The toolbar icon toggles the floating glass panel on the page. If the tab
// predates the extension (installed or reloaded since), inject the scripts on
// the spot via activeTab. Only Chrome's own pages (New Tab, chrome://, Web
// Store) forbid that, so they get a small converter window instead.
const PAGE_SCRIPTS = ["tooltip.js", "panel.js", "content.js"];
const toggle = (tabId) => chrome.tabs.sendMessage(tabId, { type: "TOGGLE_PANEL" });

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await toggle(tab.id);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: PAGE_SCRIPTS });
      await toggle(tab.id);
    } catch {
      chrome.windows.create({ url: "popup.html", type: "popup", width: 400, height: 660 });
    }
  }
});

// First run: start from the user's own currency instead of a fixed list, then show Settings.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  const { targetCurrencies } = await chrome.storage.sync.get("targetCurrencies");
  if (!targetCurrencies) {
    const home = currencyForLocale(navigator.language) ?? "USD";
    const targets = [...new Set([home, "USD", "EUR", "GBP"])];
    await chrome.storage.sync.set({ targetCurrencies: targets, targetCurrency: home });
  }
  chrome.runtime.openOptionsPage();
});

// Address bar: "fx 100 usd to inr" answers in the suggestions; Enter opens the converter on it.
const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OMNIBOX_HELP = { description: "Convert an amount, for example: 100 usd to inr" };
const homeTargets = async () => {
  const { targetCurrencies } = await chrome.storage.sync.get("targetCurrencies");
  const list = Array.isArray(targetCurrencies) ? targetCurrencies.filter(isCurrencyCode) : [];
  return list.length ? list : ["USD", "EUR", "GBP"];
};

async function answerQuery(text) {
  const query = parseQuery(text);
  if (!query) return [];
  const targets = (query.to ? [query.to] : await homeTargets()).filter((code) => code !== query.from).slice(0, 5);
  if (!targets.length) return [];
  const { rates } = await getRates(query.from, targets);
  return targets.filter((code) => rates[code].success).map((code) => ({
    content: `${query.amount} ${query.from} to ${code}`,
    description: escapeXml(`${formatMoney(query.amount, query.from)} = ${formatMoney(query.amount * rates[code].rate, code)}`)
  }));
}

chrome.omnibox.setDefaultSuggestion(OMNIBOX_HELP);
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const answers = await answerQuery(text).catch(() => []);
  chrome.omnibox.setDefaultSuggestion(answers[0] ? { description: answers[0].description } : OMNIBOX_HELP);
  suggest(answers.slice(1));
});
chrome.omnibox.onInputEntered.addListener(async (text) => {
  const query = parseQuery(text);
  if (query) {
    const to = query.to ?? (await homeTargets()).find((code) => code !== query.from) ?? "EUR";
    await chrome.storage.local.set({ popupState: { from: query.from, to, amount: String(query.amount) } });
  }
  chrome.windows.create({ url: "popup.html", type: "popup", width: 400, height: 660 });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) return;

  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (message.type === "GET_RATES_MULTI") {
    getRates(message.base, message.targets)
      .then((r) => sendResponse({ success: true, ...r }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
