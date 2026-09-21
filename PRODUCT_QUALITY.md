# Robot Wiki product quality contract

Status: **active v1.0**

Owner: Josef Chen

This contract governs whether Robot Wiki is credible, useful, and ready to
release. It complements the visual specification in
[`library/design-system.md`](library/design-system.md) and the measurable visual
checks in [`contract/design-integrity.md`](contract/design-integrity.md). It does
not replace either document.

## Product read

Robot Wiki is a technical reference for robotics engineers, researchers,
builders, and technically literate readers arriving from X. It should feel like
an edited engineering publication, not generated content wearing technical
styling.

The quality target is simple: a sceptical reader should understand what is
known, where it came from, what remains uncertain, and why the page is useful.

Visual posture for review:

- design variance: 4 of 10;
- motion intensity: 2 of 10;
- visual density: 6 of 10;
- preserve the locked paper, ink, engineering-grid, wordmark, and signal-blue
  system.

## Authority and roles

| Role | Owns | Cannot approve |
| --- | --- | --- |
| Josef | Product direction, locked-foundation changes, release | Technical evidence he has not reviewed |
| Droid | Implementation, focused regression tests, technical handoff | Its own product-quality result |
| Codex | Scope briefs, adversarial QA, rendered review, acceptance or rejection | A direction change reserved for Josef |

No agent certifies its own work. A progress count, worker report, screenshot, or
green local test is evidence, not approval.

Only one agent writes to a worktree at a time. If Codex must implement while
Droid is active, use a separate worktree or pause Droid first.

## Review personas

### RW-PERSONA-01: sceptical robotics researcher

- Goal: verify a technical claim quickly and inspect the primary evidence.
- Trust breaker: an absolute claim backed only by a bibliography, generic
  confidence badge, press summary, or unexplained score.
- Pass condition: the claim, evidence class, date, and uncertainty agree.

### RW-PERSONA-02: working robotics engineer

- Goal: learn a mechanism or compare approaches without reading filler.
- Trust breaker: decorative diagrams, repeated scene-setting, fake precision,
  or a taxonomy too noisy to navigate.
- Pass condition: the page answers a real engineering question and makes
  unknowns explicit.

### RW-PERSONA-03: technical reader arriving from X

- Goal: decide within fifteen seconds whether the page is worth saving or
  sharing.
- Trust breaker: startup copy, interchangeable social cards, inflated scope,
  visual gimmicks, or a wall of undifferentiated content.
- Pass condition: the title, first screen, and source treatment establish a
  specific reason to trust and continue.

### RW-PERSONA-04: contributor or data maintainer

- Goal: correct one fact without breaking unrelated content.
- Trust breaker: generated files edited by hand, undocumented exceptions,
  duplicate taxonomies, or tests that only protect snapshots.
- Pass condition: the source of truth, validation rule, regeneration path, and
  affected public surface are obvious.

## What counts as AI slop

A release fails this contract when any of the following is visible:

- certainty that the underlying schema or source trail does not support;
- repeated sentence frames that make independently researched entries read as
  one generated template;
- hundreds of one-off tags presented as a useful taxonomy;
- technical decoration that does not explain data, state, or mechanism;
- fake numbers, coerced zeroes, or vague confidence labels;
- generic hype, synthetic authority, or copy about how impressive the product
  is;
- semantic colour names that disagree with the rendered mark;
- desktop information dumped into an exhausting mobile scroll without
  navigation or prioritisation;
- a test suite that proves expected markup exists but never tests the reader's
  decision or the truth of the label.

Passing `npm run lint-no-slop` is necessary but does not establish that the
product is free of slop.

## Required checks

### Deterministic checks

- Routes, types, build, unit tests, focused browser tests, and accessibility.
- Unknown data remains `not disclosed`, never zero or an invented substitute.
- Structured filters use reviewed vocabularies with measured cardinality.
- Repeated prose openings and stock cross-reference phrases are counted across
  the whole corpus.
- Public certainty labels have a documented, machine-checkable basis.
- Visible colour language agrees with runtime tokens and chart descriptions.
- Modified surfaces have no document overflow at 375, 768, 1024, and 1440px.

### Independent review

Codex reviews the actual diff and rendered target against all four personas.
An LLM evaluator may suggest findings, but its score is advisory and cannot be
the release gate.

### Owner gate

Josef decides only when a correction changes a locked foundation, product
scope, information architecture, or a genuine matter of taste. Ordinary defects
do not require owner arbitration.

## Finding contract

The active queue is [`qa/findings.json`](qa/findings.json). Every finding must
contain:

- a stable ID and severity;
- the affected route and source files;
- observed evidence, including counts where possible;
- exact acceptance criteria;
- constraints that prevent collateral redesign;
- the verifier and final verification evidence.

Severity definitions:

- `P0`: deceptive, materially untrustworthy, inaccessible, or release-breaking;
- `P1`: obvious slop or a major usefulness failure;
- `P2`: local friction or polish defect;
- `P3`: optional improvement with no release impact.

Allowed states are `queued`, `ready_for_droid`, `in_progress`,
`ready_for_review`, `accepted`, `rejected`, and `blocked`.

## Batch workflow

1. Codex audits the real target and selects at most two P0 findings or three P1
   findings for one batch.
2. Droid implements only the IDs named by `currentBatch.scope` in the queue.
3. Droid preserves routes, citations, data truth, accessibility, and the locked
   identity. It does not add unrelated features or validation documents.
4. Droid returns the exact diff, changed routes, before-and-after measurements,
   desktop and mobile screenshots, tests run, and unresolved decisions.
5. Codex reruns focused checks and inspects the rendered routes. Each finding is
   accepted or rejected separately.
6. Rejected findings receive a narrower correction brief. Accepted findings
   leave the batch. The next batch starts only after the current one closes.

## Droid handoff format

```text
Batch:
Finding IDs:
Commit or diff:
Changed files and routes:
Before and after measurements:
Screenshots: 1440x900 and 375x812
Exact tests run and results:
Unresolved decisions:
Known collateral changes:
```

Do not write `done`, `fixed`, or `all tests pass` without the evidence above.

## Release decision

The design-system commands and required visual routes remain authoritative in
[`contract/design-integrity.md`](contract/design-integrity.md). Product release
also requires every P0 and P1 finding in the active batch to be `accepted` by a
reviewer other than the implementer.
