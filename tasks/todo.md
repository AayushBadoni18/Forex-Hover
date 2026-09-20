# Forex Hover Pro v3 Task Checklist

Canonical task detail: [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md). Keep statuses synchronized during execution.

## Milestone 0 — Audit and approval

- [x] M0-T1 Audit the current repository.
- [x] M0-T2 Research the current platform and product landscape.
- [x] M0-T3 Obtain user approval or revisions.
- [!] M0-T4 Revoke the exposed ExchangeRate-API credential.

## Milestone 1 — Repository and verification foundation

- [x] M1-T1 Initialize version control and secret-safe ignores.
- [x] M1-T2 Add the minimum TypeScript/build/test toolchain.
- [x] M1-T3 Capture executable regression fixtures for current behavior.
- [x] M1-T4 Add extension-load smoke tests.

## Milestone 2 — Domain model, parser, and settings

- [x] M2-T1 Create the canonical currency catalog.
- [x] M2-T2 Define typed message and storage contracts.
- [ ] M2-T3 Replace the master regex with a tokenizer/parser.
- [ ] M2-T4 Implement currency evidence resolution and domain overrides.
- [ ] M2-T5 Add settings schema, repair, and migration.

## Milestone 3 — Rate path

- [ ] M3-T1 Implement one batched, validated rate request.
- [ ] M3-T2 Build the snapshot cache and in-flight deduplication.
- [ ] M3-T3 Migrate worker messages and conversion consumers.
- [ ] M3-T4 Harden CSP, rendering, and permissions.

## Milestone 4 — Non-invasive page runtime

- [ ] M4-T1 Implement pointer/caret hover detection.
- [ ] M4-T2 Rebuild selection behavior on shared parser/settings.
- [ ] M4-T3 Add optional non-invasive underlines.
- [ ] M4-T4 Establish page-runtime performance baselines and gates.

## Milestone 5 — Extension UI

- [ ] M5-T1 Establish shared UI tokens and accessibility behavior.
- [ ] M5-T2 Refactor the tooltip for accessible states/actions.
- [ ] M5-T3 Simplify and correct the popup.
- [ ] M5-T4 Simplify and wire the options page.
- [ ] M5-T5 Add the native side-panel shell and recent conversions.

## Milestone 6 — Currency intelligence workspace

- [ ] M6-T1 Add bounded local pinned-price storage and messages.
- [ ] M6-T2 Implement pin-and-compare flow.
- [ ] M6-T3 Add on-demand historical rate context.
- [ ] M6-T4 Add context-menu conversion only if its permission is accepted.

## Milestone 7 — Reliability and verification

- [ ] M7-T1 Add privacy-preserving local diagnostics.
- [ ] M7-T2 Complete failure recovery and race handling.
- [ ] M7-T3 Expand E2E coverage to release-critical journeys.
- [ ] M7-T4 Run milestone-wide security, performance, and accessibility review.

## Milestone 8 — Delivery and demo

- [ ] M8-T1 Add CI and reproducible release packaging.
- [ ] M8-T2 Finish privacy, permission, setup, and release documentation.
- [ ] M8-T3 Publish the before/after engineering report and demo assets.
- [ ] M8-T4 Complete final release review and approval.
