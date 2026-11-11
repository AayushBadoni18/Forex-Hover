# Forex Hover Pro — Target Tech Stack

Status: proposed. Versions will be pinned to current stable releases when implementation begins and verified against their official documentation/changelogs.

## Selection summary

| Category | Choice | Why |
|---|---|---|
| Browser platform | Chrome Manifest V3, minimum Chrome 114 | Preserves the current platform and enables the native side panel |
| Language | TypeScript for source modules | Makes message/storage/provider boundaries explicit and stops catalog/contract drift |
| UI | Native HTML, CSS, and DOM APIs | The UI is small; React/Vue/Svelte add bundle/build complexity without solving a current problem |
| Bundling | esbuild with a small checked-in build script/config | Bundles content-script modules and compiles TypeScript with minimal configuration |
| Formatting | `Intl.NumberFormat` | Native currency/locale formatting and fraction-digit behavior |
| Page integration | `caretPositionFromPoint`, `Range`, CSS Custom Highlight API, Shadow DOM | Native, non-invasive hover/underline/tooltip implementation |
| Preferences | `chrome.storage.sync` | Appropriate for small cross-device settings |
| Cache/workspace | `chrome.storage.local` | Sufficient capacity and persistence; no database or unlimited quota needed |
| Rate data | Frankfurter v2 direct HTTPS API | No embedded key, batched quotes, history/time series, attribution, open/self-hostable |
| Unit tests | Node built-in `node:test` and `assert` | Standard library is enough for pure parser, settings, cache, and contract tests |
| Browser E2E | Puppeteer | Chrome documents it for extension testing; justified for real service-worker/content/UI flows |
| Static checks | TypeScript `tsc --noEmit`; optional Biome only if formatting/lint drift becomes real | Start with the smallest useful gate |
| CI | GitHub Actions after a GitHub remote exists | Common, transparent build/test/package workflow; do not add until repository destination is known |
| Release | Deterministic ZIP, checksum, manual Chrome Web Store submission first | Keeps release credentials out of CI until automation pays for itself |
| Observability | Bounded local counters/timings + debug logs | Diagnosable without collecting browsing data |
| Authentication | None | No remote account or protected server resource exists |
| Authorization | Chrome permission model + worker message allowlist | Native capability boundary |
| Database | None | Extension storage covers the proposed volume and access patterns |
| Queue/events | Chrome runtime messages and storage-change events | Native events are sufficient |
| AI/ML | None | No accepted use case beats deterministic parsing/rules |

## Frontend

### Selected: native HTML/CSS/TypeScript

The popup, side panel, options page, and tooltip have limited state and no complex component tree. Native controls improve keyboard/accessibility behavior and keep the release small. Shared rendering helpers are acceptable only where the same behavior exists in more than one surface.

Alternatives considered:

- React: rejected; runtime and toolchain overhead for a handful of forms/lists.
- Svelte: smaller than React but still introduces a framework and migration with no demonstrated need.
- Web Components: rejected as a default abstraction; Shadow DOM remains appropriate only for the injected tooltip.

Migration difficulty: low to medium. Existing HTML/CSS can be retained while inline styles/scripts are extracted and behavior is moved incrementally.

## Language and build

### Selected: TypeScript + esbuild

TypeScript is justified by three concrete failures: four drifting currency catalogs, unvalidated runtime messages, and assumed provider/cache shapes. esbuild is needed because content scripts cannot simply import arbitrary source modules from the manifest in the same way as the service worker; it also produces a deterministic distributable directory.

Alternatives considered:

- Plain JavaScript + JSDoc checking: lowest migration cost, but weaker shared discriminated contracts and more awkward build/test imports.
- Vite + CRXJS: productive for a component SPA, but adds a plugin-specific extension layer this project does not need.
- Webpack: mature but more configuration and slower feedback for this small codebase.

Migration difficulty: medium. Convert shared modules and worker first, then content/UI entry points. Do not combine conversion with feature work.

## Rate provider and cache

### Selected: Frankfurter v2 + local validated snapshots

Frankfurter exposes no-key batched rates, historical ranges, provider attribution, and self-hosting. This removes the public credential and enables the accepted historical-context feature. It provides reference rates rather than trading quotes, which matches shopping/travel use when labeled honestly.

Source: [Frankfurter v2](https://frankfurter.dev/)

Alternatives considered:

- Keep ExchangeRate-API: technically viable if using its standard batch endpoint and a user-owned key, but a shared packaged key is never secret. Historical data is plan-dependent.
- Open Exchange Rates: stable, but non-USD base selection is paid, which complicates direct multi-base use.
- Direct ECB SDMX API: authoritative but more complex, euro-centric, and narrower than the user-facing catalog.
- Managed gateway: deferred until usage/SLA proves a need; it creates operations, abuse prevention, and privacy obligations.

Cache policy:

- Key by base currency and provider/version.
- Store the whole validated snapshot and provider timestamp.
- Fresh window aligned to provider update characteristics, not an arbitrary per-pair TTL.
- Return stale snapshots up to seven days with explicit labeling.
- Deduplicate in-flight refreshes in worker memory.
- Bound total snapshots and evict least recently used bases if needed.

Migration difficulty: medium. The message response shape changes once, so migrate worker and consumers as one vertical slice.

## Storage

### Selected: Chrome extension storage only

`storage.sync` holds a compact settings object; `storage.local` holds snapshots, pinned comparisons, and diagnostics. Chrome documents approximately 100 KB for sync and around 10 MB for local storage without `unlimitedStorage`, far above the proposed bounded data.

Source: [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)

Alternatives considered:

- IndexedDB: better for large indexed collections, but the proposed list is small and key-based. Add only if measured data exceeds simple storage behavior.
- SQLite/WASM: unnecessary weight and CSP/build complexity.
- PostgreSQL/Supabase/Firebase: requires a backend, authentication, privacy policy, and operations for data that does not need to leave the device.

Migration difficulty: low. Introduce schema-versioned records and a pure legacy migration.

## Testing

### Selected: Node standard tests + Puppeteer E2E

Unit coverage targets pure, high-risk logic: parser fixtures, resolver precedence, settings repair, cache freshness, response validation, and message validation. Puppeteer covers the boundaries Node cannot: extension load, service-worker wake, real page hover/selection, popup/side-panel state, permissions, and CSP/console cleanliness.

Source: [Chrome's Puppeteer extension-testing guide](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer)

Alternatives considered:

- Jest/Vitest: useful ecosystems, but the built-in runner handles the initial pure suite with fewer dependencies.
- Playwright: capable, but Puppeteer has direct official Chrome extension examples and one browser is in scope.
- Cypress: not a good fit for loading/testing MV3 service workers and extension pages.

Migration difficulty: medium because deterministic test pages and provider mocks must be created.

## Security

Selected controls:

- Fixed provider origin; no arbitrary URL messages.
- Runtime schema validation implemented with small explicit guards, not a schema dependency unless complexity grows.
- `AbortController` timeouts.
- DOM construction with `textContent`.
- No remote code/styles/fonts.
- Minimum/optional permissions reviewed against shipped behavior.
- Secret scan in release pipeline.
- Privacy statement and local data clear/export.

Alternative considered: Zod or another runtime schema package. Rejected initially because message shapes are few and small explicit guards are clearer and cheaper.

## Observability

### Selected: local diagnostics, no default telemetry

Track bounded aggregate counters and recent error categories locally. Expose a diagnostics/export panel the user can choose to share. Use structured console logs only behind a debug setting.

Alternatives considered:

- Sentry: valuable at scale, but would transmit extension/runtime context and requires consent, filtering, retention, and another dependency.
- OpenTelemetry: unjustified without a backend or multiple services.
- Custom analytics: rejected; it creates more privacy risk than engineering value at this stage.

## Infrastructure and deployment

No runtime cloud infrastructure is selected. The only remote dependency is the rate API. CI should run type checks, unit tests, extension E2E, a manifest/package validation, and a secret scan; then produce a reproducible ZIP and checksum.

GitHub Actions is proposed only after the project has a Git repository and the user confirms its hosting destination. Local scripts remain the source of truth so another CI provider can execute the same commands.

## Technology introduction rule

No additional framework, database, cache service, queue, auth provider, analytics SDK, or AI service is approved by this document. A new dependency must tie to a measured gap, include license/maintenance/security review, and remove more complexity than it introduces.

