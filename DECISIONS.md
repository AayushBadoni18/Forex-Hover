# Forex Hover Pro — Decision Log

All entries are **Proposed** until the user approves the target architecture. Approved implementation should change accepted entries to **Accepted** with the approval date; superseded decisions remain in this file.

## D-001 — Evolve the existing extension instead of rewriting

- Status: Proposed
- Date: 2026-09-21

Context: the MV3 split, pure detector concept, Shadow DOM tooltip, popup, options page, and storage choices are sound. Failures are concentrated in parser correctness, duplicated data, request fan-out, unwired settings, and invasive DOM behavior.

Decision: preserve the browser extension and its entry points; replace weak internals through tested vertical slices.

Alternatives: full rewrite in a frontend framework; replace with a hosted web app.

Consequences: lower migration risk and visible before/after engineering evidence. Some temporary JS/TypeScript coexistence is expected.

## D-002 — Use native HTML/CSS with TypeScript modules, not a UI framework

- Status: Proposed
- Date: 2026-09-21

Context: four small UI surfaces do not need virtual DOM, routing, or framework state management. Shared message/storage/provider contracts do need stronger types.

Decision: retain native UI, migrate logic incrementally to TypeScript, bundle with esbuild.

Alternatives: plain JS/JSDoc; React; Svelte; Vite/CRXJS.

Consequences: small package and fewer runtime dependencies; a modest build step is introduced.

## D-003 — Remain local-first with no accounts or cloud database

- Status: Proposed
- Date: 2026-09-21

Context: preferences, cached rates, and a bounded comparison list fit Chrome storage. No collaboration or protected remote resource exists.

Decision: use sync storage for preferences and local storage for cache/workspace/diagnostics. Do not add authentication or a database.

Alternatives: Firebase/Supabase/PostgreSQL with user accounts.

Consequences: less privacy/operations burden; cross-browser/cloud workspace sync is deferred.

## D-004 — Use a keyless batched reference-rate provider

- Status: Proposed
- Date: 2026-09-21

Context: the current shared API key is exposed and pair requests scale with target count. Frankfurter v2 supports keyless batched and historical reference rates.

Decision: use Frankfurter v2 directly, cache one validated snapshot per base, and label rates as reference rates.

Alternatives: ExchangeRate-API standard endpoint with user key; commercial provider behind a gateway; direct ECB SDMX.

Consequences: no packaged secret and lower request count; not suitable for real-time trading claims.

## D-005 — Detect under the pointer instead of rewriting page text

- Status: Proposed
- Date: 2026-09-21

Context: startup TreeWalker scanning and span replacement can interfere with pages and creates work even without user interaction.

Decision: pointer/caret lookup parses the current text node on demand. Optional underlines use CSS Custom Highlights over ranges, not wrapper spans.

Alternatives: improve the existing MutationObserver/wrapper approach; site-specific selectors.

Consequences: default mode has near-zero startup work and preserves host DOM. Underline mode still needs bounded scanning and compatibility fallback.

## D-006 — Use the native Chrome side panel for the expanded workspace

- Status: Proposed
- Date: 2026-09-21

Context: a popup is short-lived and too narrow for comparisons/history. Chrome's side panel is persistent alongside browsing.

Decision: keep a quick popup but place comparison, history, historical context, and diagnostics in a side panel; set minimum Chrome 114.

Alternatives: enlarge popup; open a full extension tab; build a hosted dashboard.

Consequences: native persistent UX and no server; older Chrome versions are no longer supported by v3.

## D-007 — Do not add a generic provider abstraction yet

- Status: Proposed
- Date: 2026-09-21

Context: there will be one approved provider. An interface/factory with one implementation would add ceremony without isolating more risk than a module boundary already does.

Decision: put provider-specific fetch/validation in one module. Extract an interface only when a second provider is approved and implemented.

Alternatives: provider plugin/factory architecture now.

Consequences: fewer concepts and files; a future second provider will require a focused refactor.

## D-008 — Local diagnostics, no default telemetry

- Status: Proposed
- Date: 2026-09-21

Context: diagnostics are needed, but browsing activity and page content are sensitive. Store metrics and optional telemetry add privacy obligations.

Decision: keep bounded performance/error counters locally and provide explicit export/clear. Do not transmit analytics automatically.

Alternatives: Sentry, OpenTelemetry, custom event analytics.

Consequences: production-wide error rates are unavailable initially; user privacy and store compliance remain simple.

## D-009 — Test pure logic with Node and browser flows with Puppeteer

- Status: Proposed
- Date: 2026-09-21

Context: parser/settings/cache logic is pure; content scripts, service-worker lifecycle, CSP, and permissions need a real browser.

Decision: use Node's built-in test runner and a small Puppeteer E2E suite.

Alternatives: Jest/Vitest; Playwright; manual-only testing.

Consequences: few test dependencies and realistic extension coverage; deterministic provider mocking/test pages must be maintained.

## D-010 — Add infrastructure only after a measured trigger

- Status: Proposed
- Date: 2026-09-21

Context: the brief asks for scale, queues, authentication, and databases where appropriate, not automatically.

Decision: target v3 has no runtime backend. Reconsider a rate gateway only when measured provider limits/SLA require shared caching or secret-backed commercial data.

Alternatives: Cloudflare Worker/API gateway from day one.

Consequences: fewer failure modes and no operating cost; rate availability depends on the public provider and stale cache.

