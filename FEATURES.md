# Forex Hover Pro — Feature Catalog

Legend: **Existing** is present in code; **Broken/partial** is present but not reliable; **Proposed** requires approval and implementation; **Experimental/future** is not committed.

## Existing features worth preserving

| Feature | Status | Notes |
|---|---|---|
| Hover conversion | Existing, partial | Core interaction works for recognized prefix formats |
| Selected-text conversion | Existing | Uses the first detected candidate only |
| Multi-target tooltip | Existing | Fans out into one request per target on cache miss |
| Shadow DOM tooltip | Existing | Good isolation boundary; rendering needs safer DOM construction |
| Manual popup converter | Existing | Useful fallback and accessibility path |
| Swap and conversion chaining | Existing | Small, cohesive popup affordances |
| Session conversion history | Existing | Lost when popup closes |
| Target-currency selection | Existing | Stored in sync storage and broadcast to tabs |
| Rate caching | Existing | Pair-based 30-minute local cache |
| Dynamic page observation | Existing, partial | Handles added elements but not direct text-node/character-data changes |

## Existing features that need correction

| Feature | Current issue | Target behavior |
|---|---|---|
| Price parsing | 6/16 representative fixtures pass; truncation and suffix/grouping failures | Versioned parser corpus with ≥98% precision and ≥95% recall |
| Ambiguous symbols | `$` always USD; `¥` always JPY | Domain override and locale evidence with visible assumption/confidence |
| Domain overrides | Saved and rendered but unused | Longest-suffix hostname match consumed by resolver |
| Selection toggle | Saved but ignored | Listener exists only when enabled |
| Underline toggle | Saved but ignored | Native CSS highlights only when enabled |
| Currency metadata | Four divergent catalogs | One shared catalog and provider coverage mapping |
| Decimal precision | Handwritten zero-decimal lists | `Intl.NumberFormat` currency formatting with tested exceptions |
| Multi-rate fetch | N pair calls | One batch snapshot per base |
| Offline behavior | Error when provider unavailable | Explicitly stale cached conversion with timestamp |
| Page integration | Replaces text nodes and adds per-price listeners | Pointer/caret detection; no DOM replacement |
| Settings integrity | No schema or repair | Versioned validation/migration with safe defaults |
| Error handling | No timeout; partial validation | Abort timeout, stable errors, last-good snapshot |
| Permissions | Three unnecessary named permissions | Minimum required/optional permissions per shipped feature |
| Accessibility | Missing names, live regions, focus/reduced-motion support | WCAG 2.2 AA extension surfaces |
| Branding | Icon says FXconvert | One Forex Hover Pro identity |

## Proposed v3 features

### Foundation

- Locale-aware price tokenizer/parser.
- Currency resolution evidence and confidence.
- Settings migration/repair.
- Batched, stale-aware rate snapshots.
- Request coalescing and bounded cache.
- Safe DOM rendering and message validation.
- Minimum permission/onboarding model.
- Automated unit and Chrome extension E2E tests.

### Product expansion

- Persistent Chrome side panel.
- Pinned price comparison across tabs.
- Normalize every pinned price to one selected currency.
- On-demand 30/90-day reference-rate change/range.
- Current-site currency assumption and one-click domain override.
- Accessible context-menu selection conversion, if approved with its permission.
- Local data export/clear.
- Local diagnostics view.

### Reliability and release

- Reproducible build and package artifact.
- Secret scan and manifest/package validation.
- Provider failure/stale-cache tests.
- Performance benchmark pages and tracked before/after results.
- Chrome Web Store privacy/permission documentation.

## Experimental features

These are deliberately outside the committed implementation plan:

- OCR for prices embedded in images/canvas/video.
- Cross-browser Firefox build after Chrome v3 is stable.
- Optional rate alerts using `chrome.alarms` and notifications.
- Self-hosted rate gateway for measured SLA/scale needs.
- Merchant-specific structured-data adapters for sites where generic parsing is insufficient.

Each experiment requires its own evidence, risk review, and approval.

## Rejected feature bloat

- AI-generated shopping advice or price explanations.
- Cryptocurrency/trading quote support.
- User accounts and social profiles.
- Cloud-synced financial history.
- Full budgeting/portfolio management.
- Automated large-scale merchant scraping.
- Microservices, message brokers, or a cloud database without a measured need.

## Prioritization scorecard

Scores are 1–5. Higher impact/demo/depth is better; lower effort/risk is better.

| Candidate | User impact | Engineering depth | Demo value | Effort | Risk | Decision |
|---|---:|---:|---:|---:|---:|---|
| Parser + resolver | 5 | 5 | 5 | 3 | 2 | Build first |
| Batched stale-aware rates | 5 | 4 | 4 | 3 | 2 | Build first |
| Non-invasive hover/highlights | 5 | 5 | 5 | 4 | 3 | Build after fixtures |
| Side-panel comparison | 5 | 4 | 5 | 4 | 2 | Core expansion |
| Historical rate context | 4 | 4 | 5 | 3 | 2 | Add after workspace |
| Context-menu conversion | 3 | 2 | 2 | 1 | 1 | Add if permission accepted |
| Cross-browser build | 3 | 4 | 4 | 5 | 4 | Future |
| OCR | 2 | 5 | 5 | 5 | 5 | Experimental only |
| AI insights | 1 | 2 | 3 | 4 | 5 | Reject |

