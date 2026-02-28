/**
 * background.js — Forex Hover Pro v2 Service Worker
 *
 * Handles:
 *  - Single pair rate fetching (GET_RATE)
 *  - Multi-target batch rate fetching (GET_RATES_MULTI) for the new multi-currency tooltip
 *  - 30-minute TTL cache in chrome.storage.local
 */

// TODO: Replace with your ExchangeRate-API v6 key from https://www.exchangerate-api.com/
const API_KEY = "";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches a single exchange rate, using cache when available.
 */
async function getRate(base, target) {
  if (base === target) return { rate: 1, timestamp: Date.now() };

  const cacheKey = `rate_${base}_${target}`;
  const now = Date.now();

  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && now - cached[cacheKey].timestamp < CACHE_TTL_MS) {
    return cached[cacheKey];
  }

  if (!API_KEY) {
    throw new Error("API key not configured. Please add your ExchangeRate-API key to background.js.");
  }

  const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${base}/${target}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);

  const data = await response.json();
  if (data.result !== "success") throw new Error(`API error: ${data["error-type"] || "Unknown"}`);

  const entry = { rate: data.conversion_rate, timestamp: now };
  await chrome.storage.local.set({ [cacheKey]: entry });
  return entry;
}

/**
 * Fetches multiple target rates from a single base currency in parallel.
 * Returns a map: { EUR: { rate, timestamp }, GBP: { rate, timestamp }, ... }
 */
async function getRatesMulti(base, targets) {
  const results = {};
  await Promise.all(
    targets.map(async (target) => {
      try {
        const entry = await getRate(base, target);
        results[target] = { success: true, ...entry };
      } catch (err) {
        results[target] = { success: false, error: err.message };
      }
    })
  );
  return results;
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_RATE") {
    getRate(message.base, message.target)
      .then((r) => sendResponse({ success: true, ...r }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.type === "GET_RATES_MULTI") {
    getRatesMulti(message.base, message.targets)
      .then((r) => sendResponse({ success: true, rates: r }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
