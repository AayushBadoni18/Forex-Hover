# Forex Hover Pro — Milestone Review Checklist

Run this checklist at the end of every major milestone. Findings become remediation tasks in `IMPLEMENTATION_PLAN.md` before work continues.

## Scope and product

- [ ] The milestone solves the stated user problem and preserves the hover-conversion core.
- [ ] No feature/permission/dependency was added only for résumé value.
- [ ] UI copy describes shipped behavior accurately.
- [ ] Deferred ideas remain out of production paths.

## Correctness

- [ ] Acceptance criteria for every completed task are demonstrated.
- [ ] Parser/resolver fixtures cover new formats, boundaries, ambiguity, negatives, zero, and false-positive prose.
- [ ] Currency calculations use finite validated rates and preserve source/provider timestamps.
- [ ] Settings survive upgrade, corruption, sync conflict, and missing values.
- [ ] Error and offline paths are tested, not only happy paths.
- [ ] No task is marked complete without a runnable validation result.

## Architecture

- [ ] Responsibilities still match `ARCHITECTURE.md`.
- [ ] There is one currency catalog and one settings/message contract.
- [ ] Content scripts do not gain new privileged responsibilities.
- [ ] Page text is not sent outside the tab.
- [ ] No abstraction has only one implementation without a concrete boundary benefit.
- [ ] New backend/database/queue/auth components have an approved decision record and measured need.

## Code quality

- [ ] Changes are split into reviewable, independently green slices.
- [ ] Refactoring is separate from behavior changes where practical.
- [ ] No duplicate currency/settings/provider logic was introduced.
- [ ] Files near 1,000 lines are decomposed before receiving more unrelated behavior.
- [ ] Dead code, stale comments, and compatibility shims have an explicit disposition.
- [ ] Type checking, formatting/lint gate (if configured), and focused tests pass.

## Security and privacy

- [ ] No API key, token, password, private key, or credential pattern is in source/build artifacts/history.
- [ ] Runtime messages, sync/local records, domains, amounts, currency codes, and provider JSON are validated at boundaries.
- [ ] Variable DOM content is created safely; no untrusted string reaches `innerHTML`.
- [ ] Fetch origins are fixed/allowlisted, HTTPS-only, timed out, and response-size bounded where practical.
- [ ] Permissions are the minimum needed for features shipped in this milestone.
- [ ] Remote scripts/styles/fonts are absent from extension pages.
- [ ] Local data fields, purpose, retention/caps, export, and clear behavior are documented.
- [ ] No telemetry or browsing-data transmission was added without a separate consent/privacy review.

## Performance

- [ ] Benchmarks include startup, cached hover, uncached hover, dynamic page update, and large-page underline mode.
- [ ] Default hover mode produces no extension-attributable long task over 50 ms on benchmark pages.
- [ ] Cached tooltip latency remains under the agreed p95 target.
- [ ] One base refresh produces one provider request regardless of target count.
- [ ] Cache hit/miss, stale use, and in-flight dedupe behavior are measured.
- [ ] No unbounded DOM scan, list growth, storage growth, or retry loop exists.

## Reliability

- [ ] Service-worker restart/wake behavior passes E2E.
- [ ] Provider timeout, 4xx, 5xx, malformed JSON, invalid rate, and partial payload paths are covered.
- [ ] Last-good snapshots survive failed refreshes.
- [ ] Storage errors and quota/corruption behavior are bounded and visible.
- [ ] Restricted pages and denied permissions have useful fallback UX.
- [ ] Console is clean in popup, side panel, options, service worker, and test pages.

## UI/UX and accessibility

- [ ] Every control has an accessible name and visible/associated label where appropriate.
- [ ] Full flows work by keyboard with logical focus order and visible focus.
- [ ] Dynamic result/save/error status is announced with appropriate live regions.
- [ ] Text and interactive states meet WCAG 2.2 AA contrast.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Popup/side panel/options work at supported narrow and wide sizes.
- [ ] Ambiguous currency and stale-rate assumptions are visible, not hidden.
- [ ] Branding, terminology, currency formatting, and freshness labels are consistent.

## Testing

- [ ] Unit tests pass via the documented local command.
- [ ] Extension E2E tests pass in a clean browser profile.
- [ ] Tests assert user-visible behavior rather than internal implementation where possible.
- [ ] Regression tests would fail if the milestone's fixed bug returned.
- [ ] Flaky/network-dependent tests use deterministic provider fixtures.

## Documentation

- [ ] README commands and current feature claims match the repository.
- [ ] Architecture/tech-stack documents reflect approved changes.
- [ ] Significant decisions are recorded in `DECISIONS.md` before merge.
- [ ] `IMPLEMENTATION_PLAN.md` and `tasks/todo.md` statuses match.
- [ ] Permission rationale, privacy behavior, and store/release notes are current.
- [ ] Benchmark results include environment, method, baseline, and after values.

## Release and operations

- [ ] Clean install from the lockfile succeeds with dependency scripts reviewed.
- [ ] Dependency audit has no unmitigated reachable critical/high issue.
- [ ] Build is reproducible and extension artifact contains only intended files.
- [ ] Manifest validates and version/release notes are consistent.
- [ ] Artifact secret scan is clean.
- [ ] Rollback/revert path is known.
- [ ] Manual release approval is recorded.

## Milestone verdict

- [ ] Approve: milestone objectives and quality bar are met.
- [ ] Request remediation: add named tasks with owner/dependency/validation.
- [ ] Stop/re-scope: evidence invalidates the current architecture or product assumption.

