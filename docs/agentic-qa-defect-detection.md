# Controlled defect detection with an AI-generated Playwright test

## Objective and scope

Evaluate whether the existing AI-generated Playwright test detects a controlled
application regression and whether an AI-assisted investigation can identify its
cause without weakening test assertions.

This human-supervised case study extends the [Phase 1 pilot](agentic-qa.md).
Phase 2 reused the approved test; it did not invoke Planner, Generator, or Healer.
The result demonstrates detection and recovery for one deliberately selected
regression in an existing scenario.

The independent oracle was [REQ-001](../specs/agentic/requirements.md): select
`pending`, search for exactly `aVA`, and expect exactly `ORD-1001` and `ORD-1002`,
both belonging to Ava Chen with pending status. Row order is unspecified.
The [approved plan](../specs/agentic/REQ-001.plan.md) and
[generated test](../tests/agentic/order-search-and-filtering.spec.ts) preserve that
traceability. Application responses were diagnostic evidence, not a replacement
for the requirements.

## Methodology: Baseline → Mutation → Recovery

The experiment used the Phase 1 implementation at commit
`5836db7d1652cdcb863a00a9e9c4c5ab98124871`, on branch
`feat/agentic-qa-defect-detection`, with Node.js `v22.22.0` and Playwright `1.64.0`.

1. **Stage 2A — Baseline:** verify a clean tree and free ports, build the original
   application, execute the existing REQ-001 test, and preserve its evidence.
2. **Stage 2B — Mutation:** after separate human approval, change one expression,
   rebuild, and execute the same test once. Preserve the failure before diagnosis.
3. **Stages 2C.1 and 2C.2 — Investigation:** first restrict inspection to
   requirements and execution evidence; then separately authorize source analysis.
   Neither investigation changed code or executed tests.
4. **Stage 2D — Recovery:** after separate approval, restore the original
   expression, verify the complete file hash, rebuild, and execute the same test
   once. Compare all three independent runs.
5. **Stage 2E — Documentation:** inspect the preserved evidence and document the
   results without another browser execution.

The temporary mutation was confined to
[`apps/api/src/orders/routes.ts`](../apps/api/src/orders/routes.ts), line 35:

```diff
-order.customer.name.toLowerCase().includes(search)
+order.customer.name.includes(search)
```

The handler lowercases the search query, so `aVA` becomes `ava`. The changed
expression compares that against the original customer name using case-sensitive
`includes()`. `Ava Chen` therefore fails the name comparison. Neither required
order ID contains `ava`, so both orders are excluded despite satisfying the
pending filter. This violates REQ-001's explicit expected membership and count.

The human authorized this one reversible application change as a temporary
exception to [AGENTS.md](../AGENTS.md), followed by a separate restoration
exception. Requirements, tests, assertions, fixtures, dependencies, CI, and agent
configuration remained unchanged. No assertion weakening, retries, skips,
expected-failure annotations, or automatic healing were used.

## Verified results

| Stage | Result | Test duration | Cleanup |
| --- | --- | --- | --- |
| Baseline | Passed | 586 ms | Verified |
| Mutation | Failed: expected 2, received 0 | 5,487 ms | Verified |
| Recovery | Passed | 502 ms | Verified |

All runs used Chromium, one worker, zero retries, one recorded attempt, and
distinct test-owned namespaces. Each stage rebuilt the application successfully
before executing exactly the generated REQ-001 test. The seed and original suite
were not executed during these three runs. Baseline and recovery each recorded
one pass and zero failures, skips, or flaky results. Mutation recorded one
failure and zero passes, skips, or flaky results; its test still expected to pass.

| Stage | Reported run start (UTC) | Overall Playwright duration | Namespace with `deleted: true` |
| --- | --- | --- | --- |
| Baseline | `2026-10-21T23:53:18.479Z` | 3,113.411 ms | `f24fcbc2-e198-4aa5-9319-4bf22cb0500a` |
| Mutation | `2026-10-21T23:59:17.080Z` | 8,038.256 ms, rounded | `e31f41ef-4427-44f7-b3a0-1681760f23e8` |
| Recovery | `2026-10-22T00:10:57.729Z` | 3,014.340 ms | `1cc556d7-f781-4075-afeb-9e70b1d59e8e` |

The failing assertion was at generated test line 28:

```ts
await expect(ordersPage.orderRows).toHaveCount(2);
```

It observed zero rows throughout its 5,000 ms assertion timeout. Per-order
membership, customer, and status assertions were not reached during that run.
The unchanged test passed those assertions during baseline and recovery.

## AI-assisted investigation

### Evidence-constrained black-box diagnosis

The investigator inspected requirements, test assertions, execution logs,
JSON/HTML reports, trace requests/responses, the failure screenshot, and cleanup
evidence. Source inspection, patch records, changes, and reruns were prohibited.

The trace recorded the following requests in the same namespace:

| Request | HTTP status | Observed result |
| --- | --- | --- |
| `/api/orders?` | 200 | Both required Ava Chen/pending orders present |
| `/api/orders?status=pending` | 200 | Both required orders still present |
| `/api/orders?search=aVA&status=pending` | 200 | `{"orders":[]}` |

The heading and initial table visibility assertions passed, as did the assertions
for search value `aVA` and status value `pending`. The screenshot showed those
values and “No orders match your filters.” This supported an application search
filtering defect over a missing dataset, incorrect interaction, locator-only
failure, or unavailable server. Case normalization was a leading hypothesis,
not yet a confirmed implementation fact: a single recorded search spelling
cannot distinguish every possible search or combined-filter defect.

### Source-level root cause analysis

Separate approval permitted reading the mutated handler. Source reasoning
confirmed that line 32 lowercased the query, while line 35 lowercased IDs and
left customer names unchanged. The investigator identified
`order.customer.name.includes(search)` as the faulty expression and proposed
restoring `.toLowerCase()` on the name. It recommended keeping every existing
test assertion unchanged because the assertions match the independent oracle.
The correction was implemented only in the separately approved recovery stage.

**Independence disclosure:** this investigation was not fully blind. Earlier
conversation context had exposed implementation and experiment details. The
black-box stage read only the allowed evidence, but that restriction could not
erase prior context. The documented reasoning supports an evidence-constrained
diagnosis; it does not establish an unbiased, independent discovery of the fault.

## Recovery and source integrity

The complete restored `apps/api/src/orders/routes.ts` matched the original
baseline SHA-256 before recovery execution:

```text
6eff1d6ed62b64549aeceec09a7847c24d3ceae44c330ecf8686cfe9d65ea072
```

The generated test and requirements hashes matched their recorded values before
and after mutation and recovery:

```text
tests/agentic/order-search-and-filtering.spec.ts
8e876969895684a1837c1c8dc28cbf5cdcec4f27b040bb5b8cd624feb3755a02

specs/agentic/requirements.md
e7d4f775006a58637bf91b0a50837c4e60ab50704a8abf23d9c3db14618ec371
```

The rebuilt API routes also matched the baseline compiled-file hash. The working
tree was clean after recovery; no application behavior or test changes remain
from the experiment.

Each independent CLI run recorded fresh namespace-cleanup evidence in both
JSON and HTML reports, including after the assertion failure. Fixture teardown
checks DELETE 204 and a subsequent scoped GET 404 before recording
`deleted: true`. Recovery's recorded teardown assertions also passed. This
verifies these three runs only; it does not resolve the separate Phase 1 MCP
exploration lifecycle limitation described in the pilot documentation.

## Evidence provenance and repository hygiene

These results were verified from saved execution artifacts, rather than relying
only on human-reported outcomes. During documentation preparation, every entry
in all three archived `SHA256SUMS` manifests was checked. Report starts and
durations come from Playwright reports, not filesystem modification times.
The overall mutation duration above is rounded to three decimal places.

Archive paths below are relative to the repository root:

```text
Baseline: test-results/phase-2-baselines/20261021T235257Z-5836db7-3d49c336/
Mutation: test-results/phase-2-mutations/20261021T235900Z-5836db7-bc16269e/
Recovery: test-results/phase-2-recovery/20261022T001042Z-5836db7-a1190736/
```

Each archive contains build/test logs, `reports/results.json`,
`reports/index.html`, test output, stage metadata, and `SHA256SUMS`. Mutation and
recovery also contain standalone `namespace-cleanup.json` files; baseline
cleanup is embedded in its reports. Mutation evidence additionally preserves the
failure screenshot, trace, browser error context, and one-line application diff.
Recovery includes `stage-comparison.json` and a final process audit. Baseline and
mutation archives were preserved unchanged through recovery and documentation.

SHA-256 of each archived `reports/results.json`:

```text
Baseline  9bb35b067e7782f6843044c2ae6ec476c3e2c44d5157f569c2ce71db7458704c
Mutation  c7c59123d56d4d7900065512aba498009fc548a614ac44210123923270569c10
Recovery  65886237271b35011573641dfcb5f85f2eb4d06f69c92c03701a657ff29b2a1f
```

For a locally retained archive, check its complete manifest from inside that
directory with `shasum -a 256 -c SHA256SUMS`.

These archives are ignored local evidence and are not included in a clean clone.
The committed case study preserves the reviewed measurements and hashes. Do not
commit traces, videos, screenshots, temporary application copies or patches,
reports, MCP snapshots, runtime artifacts, or build output. Existing ignore rules
cover `test-results/`, `playwright-report/`, `.playwright-mcp/`, and `dist/`.
Passing runs retain no trace or screenshot under the current failure-only policy.
Future runs should use new archive directories and preserve older evidence.

## Reproducibility

The following is a manual reproduction procedure, not authorization to execute
it. Obtain fresh human approval for the temporary application mutation and each
test execution under AGENTS.md. Keep the test and requirements unchanged, inspect
each stage before proceeding, and stop on any unexpected outcome. No agents or
automatic healing are needed.

1. Use a disposable checkout with a clean working tree. From its repository root,
   inspect `git status --short`; stop if it is not empty. Create a disposable
   branch from the recorded experiment baseline and prepare dependencies:

   ```sh
   git switch -c codex/req-001-defect-reproduction 5836db7d1652cdcb863a00a9e9c4c5ab98124871
   nvm use
   npm ci
   npx --no-install playwright install chromium
   lsof -nP -iTCP:3001 -iTCP:5173 -sTCP:LISTEN
   ```

   Both ports must be free; no listener output normally gives `lsof` exit 1.
   Also check for stale test workers or application processes and stop for review
   if any remain. Do not terminate unrelated processes. Confirm the original
   routes, test, and requirements hashes against the values above.

2. In the same Bash or zsh session, create a unique ignored evidence root and
   preserve the original source before any mutation:

   ```sh
   mkdir -p test-results/phase-2-reproduction
   qa_evidence_root=$(mktemp -d test-results/phase-2-reproduction/run.XXXXXXXX)
   git check-ignore "$qa_evidence_root/"
   cp apps/api/src/orders/routes.ts "$qa_evidence_root/routes.original.ts.txt"
   ```

   Stop unless the directory is ignored and the source hash matches the baseline.

3. For **baseline**, set `qa_stage=baseline`. For each later approved stage,
   reuse the following commands with `qa_stage=mutation` or `qa_stage=recovery`.
   Create each stage directory once; stop if it already exists. Execute commands
   one at a time, and stop before testing if the build fails:

   ```sh
   qa_stage=baseline
   qa_stage_dir="$qa_evidence_root/$qa_stage"
   mkdir "$qa_stage_dir"
   shasum -a 256 apps/api/src/orders/routes.ts \
     tests/agentic/order-search-and-filtering.spec.ts \
     specs/agentic/requirements.md > "$qa_stage_dir/source-sha256.txt"
   set -o pipefail
   npm run build 2>&1 | tee "$qa_stage_dir/build.log"
   ```

   After a successful build, run only REQ-001. Capture the exit code and copy both
   output directories even when the mutation produces the expected failure:

   ```sh
   if npx playwright test \
     --config playwright.agentic.config.ts \
     tests/agentic/order-search-and-filtering.spec.ts \
     --project=chromium --workers=1 --retries=0 \
     > "$qa_stage_dir/test.log" 2>&1; then
     qa_test_exit=0
   else
     qa_test_exit=$?
   fi
   printf '%s\n' "$qa_test_exit" > "$qa_stage_dir/test.exit"
   cp -R playwright-report/agentic "$qa_stage_dir/reports"
   cp -R test-results/agentic "$qa_stage_dir/test-results"
   shasum -a 256 "$qa_stage_dir/reports/results.json" \
     "$qa_stage_dir/reports/index.html" > "$qa_stage_dir/report-sha256.txt"
   cat "$qa_stage_dir/test.log"
   ```

   Verify every archive copy succeeded before another run can overwrite live
   reports. Inspect the JSON/HTML result, retry count, namespace-cleanup attachment,
   and process state. Baseline must pass before mutation approval. Do not execute
   the seed or full original suite.

4. After approval, manually replace exactly the original customer-name expression
   with the mutated expression documented above. Review
   `git diff -- apps/api/src/orders/routes.ts` and `git diff --numstat`: only one
   insertion and one deletion in that file are permitted. Repeat step 3 with
   `qa_stage=mutation`. Confirm an assertion failure at the two-row count, HTTP 200
   with an empty result, correct input values, and successful cleanup. A nonzero
   exit alone is insufficient evidence of detection. Preserve evidence and stop
   for human investigation; do not retry or change assertions.

5. After separate restoration approval, reverse exactly that expression change.
   Confirm the complete routes hash equals the original SHA-256 before rebuilding:

   ```sh
   shasum -a 256 apps/api/src/orders/routes.ts
   cmp apps/api/src/orders/routes.ts "$qa_evidence_root/routes.original.ts.txt"
   git diff --exit-code -- apps/api/src/orders/routes.ts
   ```

   Stop on a mismatch. Repeat step 3 with `qa_stage=recovery`, expecting one pass,
   zero failures/skips/flaky results/retries, and `deleted: true`. Compare all
   source hashes and three distinct namespaces, and verify ports/processes are
   clear afterward. Keep artifacts ignored and review `git status --short`.
   Fresh timestamps, UUIDs, report hashes, and durations will differ; compare the
   behavioral outcome and source integrity rather than byte-identical reports.

## Limitations and interpretation

- Only one controlled mutation and one Chromium scenario were tested. The
  original suite and other browsers were outside this experiment's execution scope.
- The scenario already existed in the approved requirements, and the mutation
  deliberately violated it. This does not prove detection of previously unknown
  defects or establish general mutation coverage.
- The investigation was AI-assisted and human-supervised, with explicit approval
  gates. Prior conversation exposure limits claims of independent or blind diagnosis.
- No production-ready agentic QA system, autonomous operation, or measurable
  productivity improvement is claimed. Test durations are execution measurements,
  not evidence of engineering time saved.
- Prompt and repository policies are not operating-system write restrictions.
  The narrow mutation and restoration exceptions required explicit approval;
  stronger enforcement and the MCP exploration lifecycle fix remain future work.

The verified outcome is a controlled pass → fail → pass sequence using the same
requirements and assertions, with the original source restored and checked
namespace cleanup in all three independently executed tests.
