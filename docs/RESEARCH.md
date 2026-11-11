# Research — Current Technology and Product Landscape

Research date: 2026-09-21. Primary/official sources are used for platform and API claims; store listings and upstream repositories are used to compare products.

## Findings that changed the design

### 1. MV3 service workers are supposed to sleep

Chrome's extension service workers are event-driven; incoming events wake a dormant worker. Global state can disappear, so persistent state belongs in extension storage. This supports the existing service-worker architecture but invalidates the current claim that normal worker idling destroys the content-script context.

Source: [Chrome extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

### 2. `chrome.storage` is available in the service worker

The options page says the API key must be hardcoded because storage is unavailable when a worker first starts. Chrome explicitly documents `chrome.storage` across extension contexts, including the service worker. `storage.local` provides about 10 MB without `unlimitedStorage`; sync storage is about 100 KB and should hold small preferences, not secrets.

Sources: [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage), [storage and cookies](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)

### 3. Minimum permissions are a policy requirement

Chrome Web Store guidance requires the narrowest permission set for shipped functionality. Basic `tabs.query()` and `tabs.sendMessage()` usage does not require the `tabs` permission; that permission exposes sensitive tab properties. This directly supports removing `tabs`, `unlimitedStorage`, and unused `contextMenus` until a feature earns them.

Sources: [Chrome Web Store minimum-permission guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Chrome Web Store permission troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting#tabs), [declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)

### 4. Extension pages must be self-contained

The default MV3 extension-page CSP allows scripts from the package and rejects inline JavaScript. Chrome's MV3 guidance also requires extension logic to be discernible from the submitted package. The blocked inline navigation script and remote Google Fonts should be removed; system fonts are sufficient.

Sources: [extension content security policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy), [MV3 security migration](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security), [MV3 Web Store requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)

### 5. Native APIs can avoid rewriting page DOM

`Document.caretPositionFromPoint()` returns the text node and character offset under a pointer; MDN recommends the Chromium `caretRangeFromPoint()` fallback when needed. The CSS Custom Highlight API styles `Range` objects without changing the document structure and is available in Chromium versions far older than the proposed minimum. Together they enable pointer-driven hover detection and optional non-invasive underlines.

Sources: [caretPositionFromPoint](https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint), [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API), [W3C CSS Custom Highlight API](https://www.w3.org/TR/css-highlight-api-1/)

### 6. The Chrome side panel fits a persistent conversion workspace

Chrome's Side Panel API is available in MV3 from Chrome 114. It stays available alongside a page, can persist across tab navigation, and can open after a user action. This is a better home than a short-lived popup for history, pinned prices, comparisons, provider status, and historical context.

Source: [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

### 7. The current provider is used inefficiently

ExchangeRate-API's standard endpoint returns all supported rates for a base in one request. The current code calls the pair endpoint once per target. Even without changing providers, batching removes the N-request fan-out.

Sources: [ExchangeRate-API standard request](https://www.exchangerate-api.com/docs/standard-requests), [supported currencies](https://www.exchangerate-api.com/docs/supported-currencies)

### 8. A keyless, open provider is now a credible default

Frankfurter v2 exposes keyless latest, pair, historical, time-series, currency, and provider-attribution endpoints; it reports 206 currencies from 98 central banks and official sources and can be self-hosted. That removes the embedded-secret problem and unlocks historical context. The trade-off is that these are reference rates, not tick-level trading quotes; the product must say so.

Source: [Frankfurter v2 documentation](https://frankfurter.dev/)

### 9. Browser-extension E2E testing is officially supported

Chrome documents loading and testing built extensions with Puppeteer, including service-worker and popup interaction. Node's built-in test runner is enough for pure parser/cache/settings logic; Puppeteer is justified for a small set of real-browser flows.

Sources: [test Chrome extensions with Puppeteer](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer), [Chrome extension unit testing](https://developer.chrome.com/docs/extensions/how-to/test/unit-testing), [end-to-end testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

## Comparable products

| Product | Current positioning | Signal for this project |
|---|---|---|
| [Hover Currency Converter](https://chromewebstore.google.com/detail/hover-currency-converter/plbdgcecigogedfihfmabohdbbbokfka) | Hover conversion, side panel, manual converter, public APIs, local privacy; 2026 releases call out corrupted-settings repair, regression tests, accessibility, multi-character symbols, timeouts, and reduced injection | The present core is table stakes. Reliability, permission trust, accuracy, and a real comparison workflow must differentiate Forex Hover Pro. |
| [PriceHover](https://addons.mozilla.org/en-US/firefox/addon/pricehover/) | Hover and selected-text conversion, 40+ currencies, popup converter, once-daily public rates | Cross-browser and privacy-first operation are plausible future directions, not immediate reasons to split the codebase. |
| [xcondor/currency-converter-extension](https://github.com/xcondor/currency-converter-extension) | Open-source MV3 extension using TypeScript, tests, property tests, build tooling, dynamic detection | Type safety and parser tests are expected engineering hygiene, not differentiation by themselves. |
| [WageGauge](https://chromewebstore.google.com/detail/wagegauge/hjbhnamalfbomeiehfghfphjjkplimom) | Converts prices into personal time cost | Contextual decision support is a stronger product direction than merely adding more fiat codes. |

## High-value expansion candidates

### A. Contextual detection with confidence and domain rules — accept

- Problem: `$` and `¥` are ambiguous; locale/grouping rules differ; current overrides do nothing.
- User: international shoppers, travelers, researchers, remote workers.
- Fit: directly strengthens the existing core.
- Technical depth: tokenizer/parser, locale evidence, confidence model, fixtures, deterministic overrides.
- Difficulty: medium.
- Infrastructure: none.
- Demo value: high because ambiguous examples can show why a currency was chosen.

### B. Persistent side-panel comparison workspace — accept

- Problem: hover results disappear and users cannot compare prices across tabs.
- User: shoppers and travel planners comparing alternatives.
- Fit: captures the natural next action after converting.
- Technical depth: cross-context messaging, storage schema, tab/site provenance, keyboard-accessible persistent UI.
- Difficulty: medium.
- Infrastructure: Chrome Side Panel API and local storage only.
- Demo value: high.

### C. Historical rate context — accept, after correctness

- Problem: a converted number lacks context; users want to know whether the rate is unusually favorable.
- User: travelers, shoppers, freelancers billing internationally.
- Fit: currency intelligence, not trading.
- Technical depth: time-series caching, aggregation, bounded SVG visualization, freshness/provider attribution.
- Difficulty: medium.
- Infrastructure: provider time-series endpoint; no database required.
- Demo value: high if presented as a simple 30/90-day range and change.

### D. Offline/stale-aware conversion — accept

- Problem: network and provider failures currently remove all value.
- User: everyone, especially travel users.
- Fit: direct reliability improvement.
- Technical depth: validated snapshots, stale-while-revalidate, expiry policy, failure injection tests.
- Difficulty: low to medium.
- Infrastructure: existing local storage.
- Demo value: medium; strong interview reliability story.

### E. Accessible context-menu conversion — accept conditionally

- Problem: hover is not equally usable for keyboard/touch users and restricted pages.
- User: accessibility users and people preferring explicit actions.
- Fit: alternate path to the same core.
- Technical depth: low.
- Infrastructure: `contextMenus` permission, added only when the feature ships.
- Demo value: modest but important.

## Rejected or deferred ideas

| Idea | Decision | Reason |
|---|---|---|
| AI/LLM “price insights” | Reject | Adds cost, latency, privacy risk, and nondeterminism to a problem solved better with rules and reference data. |
| Cryptocurrency/trading quotes | Defer indefinitely | Different volatility, symbols, update frequency, and user expectations; dilutes the fiat browsing purpose. |
| Full budgeting/portfolio app | Reject | Requires accounts, financial data, database, and a different product model. |
| User accounts/authentication | Reject for target v3 | Chrome sync/local storage already solves preferences and local workspace. No protected server resource exists. |
| Cloud database | Reject for target v3 | Current and proposed data volumes fit extension storage. Add only after a validated multi-device collaboration need. |
| Microservices/queue/event bus | Reject | No workload justifies distributed infrastructure. Extension messages are the only event boundary needed. |
| OCR of prices in images/video | Experimental future | Useful on some sites, but model size, CPU, false positives, and privacy make it a poor near-term investment. |
| Automated merchant scraping/price monitoring | Defer | Brittle site adapters, privacy/store-policy exposure, and legal/terms risk; a user-pinned local comparison is safer and more cohesive. |
| Custom analytics pipeline | Reject by default | The Chrome Web Store already provides basic distribution metrics. Local diagnostics solve engineering needs without collecting browsing data. |

## Research conclusion

Modern browser APIs make the extension smaller, safer, and more capable without adopting a frontend framework or server platform. The defensible differentiator is not “more currencies”; it is trustworthy detection, explainable ambiguity handling, a non-invasive runtime, and a persistent decision-support workflow.

