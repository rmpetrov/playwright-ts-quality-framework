# Completed Agentic QA pilot

The human-reviewed pilot completed requirements, planning, generation, independent
execution, and evaluation. REQ-001 intentionally overlaps existing coverage to
validate the agent workflow; it does not establish new product coverage or an
unattended testing capability. Future agent work, execution, repository changes,
commits, and pushes still require the authorization defined in [AGENTS.md](../AGENTS.md).

## Completed stages

| Stage | Work and evidence |
| --- | --- |
| A — Infrastructure | Created the isolated Chromium configuration, corrected the seed to use custom fixtures, recorded independent requirements, added guardrails, and quarantined Healer. TypeScript, ESLint, build, seed execution, and the existing focused namespace-isolation test passed during setup. Original discovery was 92 executions; the initial pilot contained one seed. |
| B — Planning | Invoked `playwright_test_planner` once. Seed-backed browser exploration identified controls and semantic locators, and `planner_save_plan` saved one scenario. The human approved the plan. Business expectations remained exclusively requirements-owned. |
| C — Generation | Invoked `playwright_test_generator` once. It used the approved plan and corrected seed, explored the scenario, read its log, and created exactly one test through `generator_write_test`. TypeScript, ESLint, and pilot discovery passed. The generated test was not executed by Generator. |
| D — Independent execution | The human independently ran the generated test in Chromium. The saved JSON and HTML reports verify one passing test, zero retries, and successful namespace cleanup; exact measurements and provenance appear below. |
| E — Human review | A read-only audit compared all changed/untracked files with local `main` at `28d301e`, checked requirements-to-assertions traceability, inspected both reports, and reviewed safety/lifecycle limitations. Human review passed; documentation and pre-commit cleanup were explicitly approved. No commit or push has been authorized. |

Stage B used `planner_setup_page`, `browser_select_option`, `browser_snapshot`
(twice), `browser_type`, `planner_save_plan`, and `browser_close`. Stage C used
`generator_setup_page`, `browser_select_option`, `browser_snapshot` (twice),
`browser_type`, `generator_read_log`, `generator_write_test`, and `browser_close`.
Browser snapshots confirmed interaction mechanics and observed state; they did
not replace executing the generated assertions in Stage D.

## Source files and isolation

- [Approved requirements](../specs/agentic/requirements.md) supply the exact count,
  unordered IDs, customer, and status. They were transcribed from the human's
  approved scope, independently of application implementation.
- [Approved plan](../specs/agentic/REQ-001.plan.md) maps one scenario to REQ-001.
- [Generated test](../tests/agentic/order-search-and-filtering.spec.ts) imports
  custom `test` and `expect`, uses the existing OrdersPage, navigates independently,
  and exercises real local HTTP without mocked search/filter responses.
- [Pilot configuration](../playwright.agentic.config.ts) discovers only
  `tests/agentic/**/*.spec.ts` in Chromium, with one worker and zero retries. It
  reuses the original startup, base URL, timeouts, traces, and failure screenshots.
- [Corrected seed](../tests/agentic/seed.spec.ts) verifies browser namespace
  propagation, loaded Orders UI, and scoped API access. The invalid generated
  root-level seed was relocated and fixed; no tracked original test was deleted.
- The original application, existing test suite, custom fixtures, page objects,
  test-owned data, dependencies, original `playwright.config.ts`, and CI workflow
  are unchanged against the reviewed `main` baseline. The TypeScript test project
  additionally includes the pilot configuration. The pilot remains opt-in and
  outside the original CI test discovery.

The seed is an exploration bootstrap, not a global setup dependency or shared
state. Each test obtains its own fresh UUID namespace through the existing
fixture chain. Fixture teardown checks DELETE 204, then scoped GET 404 with
NAMESPACE_NOT_FOUND, and records cleanup evidence even after test failure.

REQ-001 assertions cover filter value `pending`, exact input value `aVA`, exactly
two body rows, one row per approved ID (`ORD-1001`, `ORD-1002`) without ordering,
and an exact visible `Ava Chen` cell and `pending` cell independently in each row.
No business expectations are calculated from application functions or responses.

## Verified Stage D execution evidence

The audit read the saved reports without rerunning browser tests. JSON and the
HTML report's embedded data agree on the generated test, Chromium project,
result, duration, retry count, and cleanup attachment. The pilot last-run file
also records passed status and no failed tests.

| Measurement | Verified value |
| --- | --- |
| Generated tests executed | 1 |
| Passed / failed / skipped / flaky | 1 / 0 / 0 / 0 |
| Test duration | 589 ms |
| Overall Playwright execution | 7.132 seconds, rounded from 7132.029 ms |
| Configured retries / result retry index | 0 / 0; one recorded attempt |
| Namespace cleanup | `deleted: true` for `31136d8d-ea01-4065-9c93-c4d78a7f1d80` |
| Run start, America/New_York | October 20, 2026, 23:13:50.293 EDT |
| Run start, UTC | `2026-10-21T03:13:50.293Z` |
| JSON report modification timestamp, America/New_York | October 20, 2026, 23:13:57.443634 EDT |
| JSON report modification timestamp, UTC | `2026-10-21T03:13:57.443634Z` |
| HTML report modification timestamp, America/New_York | October 20, 2026, 23:13:57.442786 EDT |

Report paths, relative to the repository root:

- `playwright-report/agentic/results.json`
- `playwright-report/agentic/index.html`
- `test-results/agentic/.last-run.json`

The report modification times are filesystem metadata; the run start comes from
the report. The observed source and JSON-report digests at review are:

```text
Generated test SHA-256:
8e876969895684a1837c1c8dc28cbf5cdcec4f27b040bb5b8cd624feb3755a02

Stage D JSON report SHA-256:
206ce58e9fc4f02251323da99198cc839d87c8a3cd822084ba2f6846ec917ed4
```

The latest application build passed according to the human's execution report;
no corresponding fresh build log was inspected. The earlier Stage A build pass
was separately observed during infrastructure setup. This one Chromium pass does
not establish a fresh full-suite or cross-browser pass. Reports are retained
locally as ignored execution artifacts; the summary and hashes preserve their
review provenance if future runs overwrite them.

## Current parent MCP configuration

The project-local [.codex/config.toml](../.codex/config.toml) now enables the
`playwright-test` STDIO server. Launch Codex from the repository root; its command is:

```sh
npx --no-install playwright run-test-mcp-server --config playwright.agentic.config.ts --headless
```

Stage A originally prepared it disabled. Stage B approval enabled the server;
Stage C remediation added the three Generator tools and the client connection
was reloaded. Current configuration contains only relative paths and the local
package command, with no secrets, credentials, machine-specific absolute paths,
additional environment variables, or sandbox/approval-policy overrides.

The allowlist contains exactly eleven tools:

- Planner: `planner_setup_page`, `planner_save_plan`.
- Generator: `generator_setup_page`, `generator_read_log`, `generator_write_test`.
- Browser: `browser_snapshot`, `browser_click`, `browser_select_option`,
  `browser_type`, `browser_wait_for`, `browser_close`.

It excludes test execution/debug tools and unsafe browser evaluation tools.
`default_tools_approval_mode = prompt` requests approval for each tool, including
writers that this Playwright version labels read-only. A tool approval never
constitutes authorization to advance a stage. Both named agents inherit this
shared parent allowlist; their instructions restrict which workflow they may use.

The active agents inherit parent permissions and MCP servers. Their definitions
do not attempt to override those settings through per-agent `sandbox_mode` or
`mcp_servers` entries. Setup explicitly uses project `chromium` and seed file
`tests/agentic/seed.spec.ts`; the server command selects the configuration.
Generator setup additionally receives the complete approved plan in `plan`.
There is no supported `config` argument on these setup tools.

Only Planner and Generator are in the active project agent directory. The unsafe
default Healer remains outside that directory at
`.codex/disabled-agents/playwright_test_healer.toml.disabled`, preserved for review.
Do not invoke, restore, or load it, or rerun `init-agents` to overwrite the pilot
policies. No Healer tools were enabled or used.

Configuration references used during the pilot:

- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp)
- [Codex custom agents and inherited permissions](https://learn.chatgpt.com/docs/agent-configuration/subagents)

## Guardrails and their limits

[AGENTS.md](../AGENTS.md) and both active agent definitions require separate
human approval for planning, generation, and generated-test execution. They
prohibit application/existing-test changes, weaker assertions, broadened expected
values, swallowed failures, skips/fixme/expected-failure/focused-only annotations,
retries used to hide failures, and implementation-derived business expectations.
A requirement discrepancy stops for human review; it does not authorize changing
an expected value or healing a test.

These are policy controls, not enforceable per-path write restrictions. The
Generator writer is constrained to the pilot test directory but can overwrite
the seed or another pilot file. The Planner writer can write anywhere inside the
workspace. Both writers are marked read-only by this Playwright version despite
writing files; setup can create a default seed if its explicit path is omitted.
Both agents also inherit the parent's broader capabilities. Tool allowlists and
approval prompts do not prevent a shell or another connector from editing files.

A strict future boundary needs a reviewed write-path gate or OS/container
restrictions covering both shell and MCP processes, with only stage-specific
outputs writable. No such enforcement was implemented in this pilot. Healer
quarantine prevents project discovery, not restoration, a global replacement
agent, or direct CLI execution; those remain policy-prohibited without approval.

## Known MCP exploration lifecycle limitation

During both Stages B and C, `browser_close` reported no open tabs, but seed workers,
Chromium processes, and application servers remained active. Seed setup uses
`pauseAtEnd: true` and disables configured reporters. Page closure is not an
acknowledgement that the paused test, fixture teardown, or server shutdown finished.
Neither stage produced verified fresh namespace-cleanup evidence. The human
explicitly accepted that evidence gap as a limitation, not a confirmed cleanup
failure. Previous servers were subsequently terminated before independent execution.

Stage D's independent CLI run completed normal fixture teardown and recorded
`deleted: true`. That verifies cleanup for that run only; it does not establish
successful fixture deletion during either exploration stage. Terminating an
in-memory API removes its stores but is not proof its fixture assertions passed.

Recommended future lifecycle fix, not implemented here:

1. Give each exploration stage an owned MCP connection and process group.
2. Add a separately reviewed explicit end-of-exploration control that stops or
   resumes the paused seed, awaits fixture/global teardown, propagates failures,
   and returns a fresh cleanup receipt. No such control is exposed by the current
   pilot allowlist; do not invent or assume a tool name.
3. Gracefully dispose the owned server and await worker/browser/server exit with
   a bounded timeout. The installed disposal path attempts `stopTests` and global
   teardown, but catches cleanup errors into debug logging; exit alone is not a
   substitute for the explicit receipt.
4. Check PIDs and free ports 3001/5173 before a separate CLI run. If cleanup cannot
   be verified, report it and obtain approval for any termination; do not silently
   kill processes or reuse an older report as evidence.

No lifecycle wrapper, new MCP tool, fixture change, or process termination is part
of this documentation cleanup. Independent CLI/MCP runners must not share the
fixed ports concurrently; `reuseExistingServer` remains false.

## Repository hygiene and future verification

`.gitignore` excludes `.playwright-mcp/`, `playwright-report/`, `test-results/`,
`dist/`, and `coverage/`. Temporary YAML snapshots, reports, traces, recordings,
last-run files, and compiled output remain local and must not be staged. Existing
execution evidence and temporary snapshots were preserved rather than deleted.
Commit only the reviewed source/configuration/policy/documentation manifest.

The completed pilot should discover 92 original executions in 7 files and two
pilot tests in 2 files (the exploration seed plus one generated test). Discovery
is not test execution. Final pre-commit validation uses only:

```sh
npm run typecheck
npm run lint
npx --no-install playwright test --config playwright.config.ts --list --reporter=list
npx --no-install playwright test --config playwright.agentic.config.ts --list --reporter=list
git diff --check
```

Future browser execution requires separate explicit human approval. This final
preparation does not rerun browser tests, invoke agents, modify application
behavior, implement the lifecycle fix, commit, or push.

### Final pre-commit validation — October 20, 2026 (America/New_York)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed across all existing TypeScript projects, including the pilot config/test |
| `npm run lint` | Passed with zero warnings |
| Original configuration discovery | 92 executions in 7 files; no pilot files included |
| Pilot configuration discovery | 2 tests in 2 files, both Chromium: seed plus one generated test |
| `git diff --check` | Passed |
| MCP configuration inspection | Exactly the approved eleven tools; no secrets, absolute machine-specific paths, extra environment settings, or changed permissions |
| Repository hygiene | Snapshot/report/result/build files ignored; no ignored artifacts tracked; exact reviewed source/configuration/documentation manifest |
| Source and execution-evidence preservation | Generated test, approved requirements/plan, seed, JSON/HTML reports, and last-run evidence retained unchanged |
| Protected-path comparison | Original application, existing tests/fixtures/page objects/data, dependencies, original runner config, and CI unchanged against `main` at `28d301e` |

These static checks and discovery runs are separate from the previously recorded
Stage D browser execution. No additional browser test or application build was
executed during this final preparation.

## Phase 2 follow-up — Controlled Defect Detection

The completed [Phase 2 case study](agentic-qa-defect-detection.md) records a
baseline → mutation → recovery experiment. The existing AI-generated test detected
a controlled search regression, AI-assisted investigation identified the faulty
implementation, and recovery restored the original behavior with unchanged test
assertions. The report includes verified results, cleanup evidence, reproduction
instructions, and the investigation's independence limitation.
