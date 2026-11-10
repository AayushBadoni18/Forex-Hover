/**
 * background.js — Forex Hover Pro service worker.
 *
 * Keyless rates: one validated snapshot per base currency, cached in
 * chrome.storage.local, deduplicated in flight, stale-but-labelled offline.
 */
import { createRateCache } from "./src/shared/rates.ts";
import { isRuntimeMessage } from "./src/shared/validate.ts";

const getSnapshot = createRateCache(chrome.storage.local);

async function getRates(base, targets) {
  const { snapshot, stale } = await getSnapshot(base);
  const rates = {};
  for (const target of targets) {
    const rate = snapshot.rates[target];
    rates[target] = rate
      ? { success: true, rate, timestamp: snapshot.fetchedAt, stale }
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) return;

  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (message.type === "GET_RATE") {
    getRates(message.base, [message.target])
      .then(({ rates, source }) => sendResponse({ ...rates[message.target], source }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.type === "GET_RATES_MULTI") {
    getRates(message.base, message.targets)
      .then((r) => sendResponse({ success: true, ...r }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
