# Forex Hover Pro — Roadmap

Roadmap status: proposed and gated on approval. Detailed task definitions and validation live in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Now — audited v2

- Working MV3 hover/selection/manual conversion core.
- Shadow DOM tooltip and local pair cache.
- Strong visual concept.
- Known parser corruption, exposed provider key, unwired settings, broad permissions, DOM mutation, no tests/CI/docs.

Exit condition: user approves or revises the proposed architecture.

## Near term — trustworthy core

1. Establish Git/build/test baseline and revoke/remove the exposed credential.
2. Introduce one currency catalog and typed contracts.
3. Replace the master regex with a fixture-driven parser/resolver.
4. Switch to one validated, stale-aware rate snapshot per base.
5. Wire or remove every visible preference.
6. Minimize permissions and make extension pages CSP-clean.

Outcome: current value works reliably and honestly before new surface area is added.

## Major upgrade — non-invasive runtime

1. Pointer/caret hover detection with no text-node replacement.
2. Selection mode that respects settings and multiple candidates.
3. Optional CSS Custom Highlight underlines with idle/incremental scanning.
4. Domain/locale currency assumptions with user-visible explanations.
5. Performance benchmarks against representative static and SPA pages.

Outcome: the extension is fast, compatible, and technically differentiated.

## Product expansion — currency intelligence workspace

1. Native Chrome side panel.
2. Persistent recent conversions.
3. Local pinned-price comparison across tabs.
4. On-demand 30/90-day reference-rate context.
5. Current-site assumption/override controls.
6. Optional accessible context-menu path.

Outcome: a cohesive decision-support product rather than a one-off tooltip.

## Production readiness

1. Full unit/E2E/error-path suite.
2. Accessibility and reduced-motion pass.
3. Local diagnostics/export/clear.
4. Reproducible package, secret scan, checksums, and release notes.
5. Privacy policy, permission rationale, screenshots, demo script, and store listing.
6. Baseline-vs-v3 performance/correctness report.

Outcome: a defensible release and interview-ready engineering story.

## Later, only with evidence

- Firefox/WebExtensions build after Chrome stabilizes.
- Rate alerts if users request proactive monitoring.
- Self-hosted rate gateway if public-provider reliability or quotas become limiting.
- Site adapters only for high-value incompatibilities not solvable generically.
- OCR only as an isolated experiment with clear CPU/privacy budgets.

## Explicit non-goals

- Trading or financial advice.
- Cryptocurrency market data.
- User accounts/social features.
- Cloud financial-history storage.
- Full budgeting or portfolio management.
- AI features without a validated problem.

