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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isRuntimeMessage(message)) return;

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
