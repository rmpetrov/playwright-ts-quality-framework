# Verification record

## Historical Phase 1 checkpoint — October 11, 2026

This section preserves the original local verification using Node 22.22.0,
npm 10.9.4, and macOS ARM64. Counts, timings, file inventory, and Git state below
describe that checkpoint, rather than the current state of a published checkout.
At that time, implementation changes were uncommitted on `feat/initial-framework`,
HEAD was the initial setup commit `1c20051`, and no remote, push, or pull request
had been created.

### Recorded results

| Verification | Result |
| --- | --- |
| `npm install --fetch-retries=0 --fetch-timeout=10000` | Passed; generated lockfile; audit reported zero vulnerabilities at installation |
| `npm ci --fetch-retries=0 --fetch-timeout=10000` | Passed; clean install from the lockfile |
| `npm run typecheck` | Passed for API, frontend, tests, and tooling |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; backend JavaScript and frontend assets emitted |
| `npm ls --depth=0` | Passed; direct dependencies resolved without reported invalid peers |
| `npx playwright install chromium firefox webkit` | Passed; all three matching browser binaries installed |
| `npm run test:api` | 6 passed: five application API scenarios and one isolation scenario |
| `npm run test:ui` | 6 passed: Chromium 2, Firefox 2, WebKit 2 |
| `npm run test:isolation` | 1 passed |
| Combined suite with `CI=true` | 12 passed, 0 failed, 0 skipped, 2 workers, 0 retries; 11.8 seconds |
| Normal/test-mode HTTP smoke checks | Passed |
| Vite development proxy smoke check | Passed |
| Deliberately failing temporary cleanup probe | Failed intentionally; both owned namespaces removed; no teardown errors |
| `git diff --check` | Passed |

Historical combined project command (the output path was local to that run):

```sh
CI=true PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/quality-final-results.json npm test -- --reporter=list,html,json
```

The final machine-readable report was inspected to verify one passed attempt per
test, retry index zero, two workers, and zero retries in every project's resolved
configuration. This is a local run with CI settings, **not** a GitHub Actions run.

### Recorded isolation and real HTTP evidence

The isolation scenario started with `ORD-1001` pending in two distinct namespaces.
After PATCH in namespace A, GET returned processing in A and pending in B. Both
responses were checked against explicit test-owned full order objects.

Each browser's update scenario changed the order through the Vite preview proxy,
then checked that change with a direct APIRequestContext using its own namespace.
The UI also retained the change after reload. All three browsers passed this check.
Tests use real loopback Fastify HTTP endpoints; they do not fulfill mocked routes.

All 12 final tests contained cleanup attachments. Inspection found **13 unique
namespace IDs**, each confirmed deleted and inaccessible. The extra namespace is
owned by the isolation test. Each teardown checked DELETE returned 204 and a
subsequent scoped GET returned 404 / NAMESPACE_NOT_FOUND.

A temporary `tests/api/cleanup-probe.spec.ts` created two namespaces, read an
order over HTTP, then threw an intentional error. Its JSON report contained only
that intentional test error; its cleanup attachment confirmed both namespaces
deleted and inaccessible. The probe was removed before the final full run and is
not part of the delivered suite.

Temporary smoke scripts used real HTTP to verify:

- With support disabled, `/__test/namespaces` returned 404 / ROUTE_NOT_FOUND,
  while normal order listing returned six seeded orders.
- Invalid query status returned 400 / VALIDATION_ERROR with the documented shape.
- Test mode returned 400 / NAMESPACE_REQUIRED for a missing header and
  404 / NAMESPACE_NOT_FOUND for an unknown namespace.
- `ENABLE_TEST_SUPPORT=true` with `NODE_ENV=development` rejected server startup.
- Vite development served HTML, transformed the React entrypoint, and forwarded
  a scoped PATCH to Fastify; a direct API read confirmed the persisted change.

**Historical temporary commands — not available from a repository checkout.**
The cleanup specification was removed; the `/private/tmp` scripts and reports were
ephemeral files outside the repository. These entries document the original checks,
not supported project commands:

```text
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/quality-cleanup-probe.json npx playwright test tests/api/cleanup-probe.spec.ts --project=api --reporter=list,json
node /private/tmp/quality-http-smoke.mjs
node /private/tmp/quality-dev-proxy-smoke.mjs
```

For available commands, use the README and the standalone regression command
`npm run test:regression`. The test-support configuration check now has a permanent
automated regression; the original temporary failure-cleanup probe remains historical.

### Failures encountered and resolved at that checkpoint

Initial type checking caught Fastify's unknown error type and an optional Playwright
header type. Error metadata now uses explicit narrowing, and the API context sets
its required namespace header directly. Initial linting identified unnecessary
async callbacks; synchronous Fastify handlers now explicitly send their replies.

The first real API run had 5 passes and 1 failure: Playwright serialized the string
used for malformed JSON into valid JSON. The request was corrected to send raw
bytes using `Buffer.from('{')`. The expected 400 / BAD_REQUEST assertion was
retained, and the complete API project subsequently passed. Assertions were not
relaxed to achieve a pass.

Sandboxed npm registry access initially failed with ENOTFOUND. Local HTTP server
startup initially failed with EPERM. Downloads and HTTP/browser verification
were rerun with approved permissions. No browser or required local system
dependency remained unavailable. Color-environment warnings were non-fatal.

### Original Phase 1 file inventory

Changed: `README.md`. The initial `.gitignore` was preserved.

Created:

```text
.nvmrc
.github/workflows/quality.yml
package.json
package-lock.json
eslint.config.js
playwright.config.ts
vite.config.ts
tsconfig.json
tsconfig.api.json
tsconfig.web.json
tsconfig.tests.json
tsconfig.tools.json
apps/api/src/app.ts
apps/api/src/server.ts
apps/api/src/errors.ts
apps/api/src/store/seed.ts
apps/api/src/orders/rules.ts
apps/api/src/orders/routes.ts
apps/api/src/test-support/namespaces.ts
apps/web/index.html
apps/web/src/main.tsx
apps/web/src/App.tsx
apps/web/src/styles.css
apps/web/src/api/orders.ts
apps/web/src/components/OrderRow.tsx
tests/fixtures/test.ts
tests/data/orders.ts
tests/pages/orders.page.ts
tests/api/orders.spec.ts
tests/api/namespace-isolation.spec.ts
tests/ui/orders.spec.ts
docs/architecture.md
docs/verification.md
```

`node_modules`, `dist`, `playwright-report`, and `test-results` are generated and
Git-ignored. `npm run report` opens the most recently generated HTML report;
the historical report itself is not included in the repository.

### Limits recorded at that checkpoint

GitHub-hosted Linux CI had not been executed at that checkpoint. State is intentionally
in-memory, test-support namespaces are not authentication, fixed ports permit
one suite invocation at a time, and abrupt process termination can skip teardown.
The initial scenarios do not exhaustively cover all transitions and input boundaries.

After review, the recommended next milestone is a small independent transition
and validation-boundary coverage matrix. Accessibility, visual regression, network
failure injection, databases, and Docker remain outside this delivered MVP.

## Pre-publication cleanup checkpoint — October 11, 2026

This later local checkpoint verified the focused cleanup using the same Node
22.22.0/npm 10.9.4 environment. The original results above remain historical.

| Available project command | Cleanup result |
| --- | --- |
| `npm run typecheck` | Passed for API, frontend, tests, and tooling |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; emitted backend and frontend assets |
| `npm run test:api` | Original 6 passed, including namespace isolation; 2.5 seconds |
| `npm run test:ui` | Original 6 passed: Chromium 2, Firefox 2, WebKit 2; 6.8 seconds |
| `npm run test:regression` | New 4 passed, separately from Playwright; 0 failed or skipped |
| `npm ls --depth=0` | Passed; no dependency additions or invalid peers reported |
| `git diff --check` | Passed |

All **12 existing Playwright executions** remained successful against real local
HTTP endpoints, with the original fixtures and assertions preserved and retries
still zero. API and UI projects were run separately at this checkpoint.

The **four new standalone tests** comprise:

- One test-support endpoint/configuration regression: independent app instances
  return 404 / ROUTE_NOT_FOUND for both POST and DELETE when support is disabled;
  enabling support outside test mode is rejected; only the explicit intended
  configuration (`NODE_ENV=test`, `ENABLE_TEST_SUPPORT=true`) enables namespace
  creation (201) and deletion (204).
- Three frontend response checks: list errors, update errors, and successful
  response shapes. They cover malformed JSON, empty bodies, HTML, null/primitive
  bodies, missing or unusable messages, invalid orders, usable server messages,
  and valid order/list responses.

The endpoint regression uses Fastify injection and closes its own app instances
in `finally`. It does not bind application ports, mutate process.env, or contact
the Playwright server. The client checks use test-local synthetic fetch responses,
with mocks restored by Node's test runner; they are unit checks, not additional
real-HTTP Playwright scenarios. `npm run test:regression` is a supported checkout
command, and the CI workflow includes it using the existing tsx dependency.

The first standalone regression invocation was blocked by sandbox EPERM on tsx's
temporary IPC socket. Rerunning with approved permissions passed all four tests.
Local Playwright verification also used approved server/browser permissions.
There were no functional test failures during this cleanup.

Changed during cleanup: `README.md`, `docs/verification.md`,
`docs/architecture.md`, `apps/web/src/api/orders.ts`, `apps/api/src/server.ts`,
`package.json`, and `.github/workflows/quality.yml`. Added:
`apps/api/src/test-support/config.ts`, `tests/regression/test-support.test.ts`,
and `tests/regression/orders-client.test.ts`. No dependency or lockfile changes
were needed. No commit, push, or pull request was created during this checkpoint.

GitHub-hosted Linux CI was not executed at this checkpoint. Existing in-memory
storage, fixed-port, and abrupt-termination limitations remain. Frontend checks
validate the small response shape; exhaustive business semantics and every
transition/input boundary remain outside the MVP.

## Phase 2A checkpoint — October 12, 2026

Local verification used Node 22.22.0, npm 10.9.4, and macOS ARM64. The working
tree was clean before fetching `origin/main` and creating
`feat/advanced-api-coverage` from merged MVP commit `7e2e0e8`. All Phase 2A changes
remain uncommitted on that branch. No push, merge, or pull request was created.

### Coverage changes

The initial API project had six tests. Only pending → processing and pending →
shipped rejection were covered from the sixteen possible status pairs. Search
coverage was one combined pending/customer query; query validation and length
boundaries had no permanent Playwright scenarios.

The expanded API project has **23 tests**, a net addition of **17**. Three original
scenarios moved into the new matrices instead of being duplicated.

- Nine transition tests cover four allowed pairs, twelve rejected pairs grouped
  by starting status, and a pending → processing → shipped workflow. Assertions
  check complete responses, exact 409 contracts, independent GET persistence,
  and unchanged orders after rejection, including all terminal updates.
- Eleven query tests cover ID/customer case-insensitivity, surrounding whitespace,
  combined filters, every status-only filter, both kinds of empty results, the
  99/100/101-character boundary before trimming, and invalid queries. Invalid
  cases include unsupported/uppercase/empty status values, an unknown parameter,
  and repeated search/status keys expressed through HTTP. Assertions check exact
  400 contracts, deterministic ordered contents, and an unchanged full store.
- Existing invalid payload, unknown-order read, and two-namespace isolation
  coverage remains. All expected responses are test-owned; no application rules
  or seed data are imported. Application code and the demo's scope are unchanged.

### Executed checks

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed; 237 packages installed from the existing lockfile |
| `npm run typecheck` | Passed for API, frontend, tests, and tooling |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; compiled backend and built frontend |
| `npm run test:regression` | 4 passed, 0 failed or skipped |
| `npm run test:api -- --reporter=list,html,json` | 23 passed; 4 workers, 0 retries; 2.91 seconds |
| `npm run test:api -- --workers=4 --retries=0 --repeat-each=3 --reporter=list,html,json` | 69 passed; 4 workers, 0 retries; 4.69 seconds |
| `CI=true npm test -- --reporter=list,html,json` | 29 passed: API 23, Chromium 2, Firefox 2, WebKit 2; 2 workers, 0 retries; 9.91 seconds |
| JSON result/cleanup inspection | Passed; one successful attempt per execution, no skips/failures/flaky results, all namespaces unique and deleted |
| `git diff --check` | Passed |

JSON reports were requested with the following local commands:

```sh
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2a-api-default.json npm run test:api -- --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2a-api-repeat.json npm run test:api -- --workers=4 --retries=0 --repeat-each=3 --reporter=list,html,json
CI=true PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2a-full-ci.json npm test -- --reporter=list,html,json
```

These report paths are ephemeral local evidence, not files shipped with the
repository. The final HTML report is available through `npm run report`.
The combined run used local CI settings; **GitHub-hosted Linux CI was not run**
for Phase 2A. Matching browser binaries were already installed and all three
browsers executed successfully; no browser download was needed at this checkpoint.

### Parallel execution and isolation evidence

All three JSON reports showed `fullyParallel: true`, zero configured retries in
every project, and exactly one passed result with retry index zero per execution.
Actual parallel-slot indices covered all four slots in each API run and both
slots in the combined run. The repeated run exercised every API test three times
with fresh namespaces and had no failing, skipped, or flaky outcomes.

Every execution had a namespace-cleanup attachment:

| Run | Executions | Unique namespaces confirmed deleted |
| --- | --- | --- |
| API default | 23 | 24 |
| API repeated three times | 69 | 72 |
| Combined suite | 29 | 30 |
| Total | 121 | 126 |

Namespace IDs were also unique across all three runs. Each isolation execution
owned two namespaces; every other execution owned one. All cleanup entries had
`deleted: true` and no errors. The unchanged fixture verifies DELETE 204 followed
by GET 404 / NAMESPACE_NOT_FOUND before recording successful cleanup. The existing
isolation test and each browser's UI-update/direct-API-read check passed.

### Execution limitations and remaining gaps

The initial sandboxed regression command could not create tsx's IPC socket
(`EPERM`). The initial sandboxed API run could not bind the loopback API port
(`EPERM`). Both commands were rerun with approved permissions and passed;
subsequent HTTP/browser runs used approved permissions. There were no functional
test failures and no application defects requiring correction. Color-environment
warnings were non-fatal.

Changed files: `tests/data/orders.ts`, `tests/api/orders.spec.ts`, `README.md`,
`docs/architecture.md`, and `docs/verification.md`. Added:
`tests/api/order-transitions.spec.ts` and `tests/api/order-queries.spec.ts`.
Fixtures, runner configuration, CI workflow, dependencies, lockfile, and all
application files remain unchanged.

The complete status-pair matrix is covered, but other error paths (such as PATCH
of a missing order or unknown application routes), Unicode search semantics,
and competing writes to the same order remain untested in this phase. In-memory
storage, fixed ports, and abrupt-termination cleanup limitations remain.
Accessibility, visual regression, and network failure injection are deferred.

## Phase 2B checkpoint — October 12, 2026

Local verification used Node 22.22.0, npm 10.9.4, and macOS ARM64. The working
tree was clean on `feat/advanced-api-coverage` before fetching `origin/main` and
creating the requested `feat/ui-failure-testing` branch from merged Phase 2A
commit `5ea2189`. Changes remain uncommitted; no push, merge, or PR was created.

### Existing behavior and coverage gaps

The client already handled non-2xx JSON errors, unusable error bodies, malformed
success JSON, and invalid order shapes. The screen already had alert, loading,
and empty states, and used AbortController to ignore obsolete listing results.
There was no Retry button, client timeout, or automatic retry. The two existing
UI specifications covered only successful filtering/empty results and a successful
update with real persistence. Three standalone client regressions exercised
response parsing but did not verify browser error states, transport failures,
usable controls, delayed loading, cancellation, or recovery.

### Reproduced defects and minimal fixes

1. **Browser transport errors leaked into alerts.** Expected: an operation-specific,
   readable error with supported reload/update recovery. Actual: Chromium displayed
   `Failed to fetch`. Reproduction: route the browser's exact GET `/api/orders` to
   `route.abort('failed')`, open the screen, and inspect its alert (the equivalent
   PATCH also bypassed normalization). Root cause: fetch rejections occurred before
   response validation and propagated their native message directly to App.
   Fix: catch transport rejections and use the existing load/update fallback,
   retaining the cause for diagnostics. An aborted listing preserves its original
   cancellation. Both browser network cases and two standalone regressions cover
   normalization and cancellation.
2. **A rejected update removed all rows and controls.** Expected: the previous
   persisted status remains visible and controls become usable after failure.
   Actual: a mocked 503 displayed its alert but removed the order table.
   Reproduction: load the real seed, intercept PATCH `/api/orders/ORD-1001/status`
   with 503 JSON, select processing, click Update, and inspect the pending row.
   Root cause: listing and update errors shared the state guarding table rendering
   (`!error`). Fix: separate update-error state while using the existing alert;
   clear it on a supported refetch or new update. All five failed-update cases
   check the original status, re-enabled controls, and successful real resubmission.

Before the fixes, the focused Chromium run had exactly **two expected assertion
failures**, one for each defect. Both namespace cleanup attachments confirmed
deletion, with no teardown errors. Assertions were retained when implementing fixes.
No backend, component redesign, business-rule, fixture, runner, dependency, or
CI change was needed.

### Delivered network scenarios

Twelve new cases in `tests/ui/network-resilience.spec.ts` run in all three browsers:

- Five GET failures: 500 with the existing JSON error contract; 503 HTML;
  malformed 200 JSON; a 200 list mixing a valid order and an invalid customer
  shape; transport failure. Exact visible alerts exclude internal errors, no
  partial table appears, and removing interception/reloading restores real rows.
- Five PATCH failures: 503 JSON; documented 409 / INVALID_TRANSITION; transport
  failure; malformed 200 JSON; invalid 200 order shape. Controls are disabled
  while held and enabled after rejection; the pending status remains visible
  and no success notice appears. Real direct API reads verify both the full target
  and full store are unchanged. Removing interception and clicking the existing
  Update button performs a real update with independently confirmed persistence.
- Controlled initial listing: a promise holds the GET before forwarding it;
  loading is visible until release, then real rows appear.
- Obsolete request: a pending-filter GET captures a real response via `route.fetch`.
  Search changes to ORD-1002 while that older response is held. The newer real
  response renders first; releasing the old response cannot replace it. The
  browser's requestfailed event confirms cancellation and no alert appears.

Routes match the exact browser origin/path and intended HTTP method. Failed PATCH
handlers never forward requests. Namespace-management endpoints, assets, and
APIRequestContext reads are outside interception. All gates are test-local,
released in `finally`, and drained with `unrouteAll({ behavior: 'wait' })`.
Tests use request events and locator assertions without sleeps or application hooks.

### Executed checks

| Command/check | Actual result |
| --- | --- |
| `npm ci` | Passed; 237 packages installed from the existing lockfile |
| `npm run typecheck` | Passed for API, frontend, tests, and tooling |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; emitted backend and built frontend |
| `npm run test:regression` | 6 passed, 0 failed or skipped |
| New network suite, all three browsers | 36 passed; 4 workers, 0 retries; 15.79 seconds |
| New network suite, `--workers=4 --retries=0 --repeat-each=3` | 108 passed; 37.78 seconds |
| `npm run test:api -- --reporter=list,html,json` | 23 passed; 4 workers, 0 retries; 1.67 seconds |
| `npm run test:ui -- --reporter=list,html,json` | 42 passed; 4 workers, 0 retries; 15.18 seconds |
| `CI=true npm test -- --reporter=list,html,json` | 65 passed; 2 workers, 0 retries; 18.72 seconds |
| JSON result/cleanup inspection | Passed; no retries, skips, failures, flaky outcomes, or cleanup errors in post-fix runs |
| `git diff --check` | Passed |

| Browser | New suite | New suite repeated three times | Complete UI suite | UI within combined CI-settings run |
| --- | --- | --- | --- | --- |
| Chromium | 12 passed | 36 passed | 14 passed | 14 passed |
| Firefox | 12 passed | 36 passed | 14 passed | 14 passed |
| WebKit | 12 passed | 36 passed | 14 passed | 14 passed |

JSON evidence was requested alongside the existing list/HTML reporters:

```sh
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2b-network.json npx playwright test tests/ui/network-resilience.spec.ts --project=chromium --project=firefox --project=webkit --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2b-network-repeat.json npx playwright test tests/ui/network-resilience.spec.ts --project=chromium --project=firefox --project=webkit --workers=4 --retries=0 --repeat-each=3 --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2b-api.json npm run test:api -- --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2b-ui.json npm run test:ui -- --reporter=list,html,json
CI=true PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2b-full-ci.json npm test -- --reporter=list,html,json
```

These `/private/tmp` files are ephemeral local evidence, not shipped repository
files. `npm run report` opens the final combined HTML report. Matching browser
binaries were already installed; all three executed without a download.
The unchanged workflow discovers the new file through each UI project's existing
`ui/**/*.spec.ts` pattern and retains failure traces/screenshots and cleanup evidence.

### Determinism, isolation, and backend-state evidence

All post-fix reports showed `fullyParallel: true`, zero configured retries in
every project, and exactly one successful attempt with retry index zero for each
execution. There were no skipped or flaky outcomes. Actual parallel-slot indices
covered all four slots in the default/repeated runs and both slots in the combined
CI-settings run. Each new scenario executed three times per browser in the repeated
run, with fresh namespaces and no shared route state or timing sleeps.

| Run | Successful executions | Unique namespaces confirmed deleted |
| --- | --- | --- |
| New network suite | 36 | 36 |
| New network suite repeated three times | 108 | 108 |
| Complete API suite | 23 | 24 |
| Complete UI suite | 42 | 42 |
| Combined CI-settings suite | 65 | 66 |
| Total | 274 | 276 |

Every execution contained a namespace-cleanup attachment. All namespace IDs were
unique within and across these five runs; each entry had `deleted: true` with no
error. The unchanged fixture checks DELETE 204 and a subsequent real scoped GET
404 / NAMESPACE_NOT_FOUND before recording deletion. The extra namespaces belong
to the API isolation scenario. Both intentionally failing pre-fix reproductions
also cleaned up their two namespaces successfully.

Every network scenario checks the complete real store against independent seed
expectations. Each failed PATCH checks the target separately before recovery;
only the subsequent unmocked user update changes ORD-1001 to processing, with
all other orders still unchanged. Browser namespace headers are checked at route
capture, while real reads go directly to Fastify using the same test's namespace.
The existing two-namespace isolation scenario and original browser persistence
workflow also passed. No fixture, page object, or API business-rule test changed.

The sandbox initially blocked loopback server binding and tsx's IPC socket with
EPERM. These commands were rerun with approved permissions. After the two defects
were fixed, no functional test failures occurred. An initial new-test header type
error and a caught-error lint requirement were corrected without relaxing checks.
Color-environment warnings were non-fatal. No dependency or lockfile changed.

### Verification scope and limitations

Mocked HTTP errors prove frontend handling, not that Fastify generates those
failures. The mocked 409 represents a stale-client business-error contract; it
does not exercise actual competing writes. An aborted request simulates transport
failure, not an OS-level offline condition. Invalid mocked success responses
prove validation and lack of false success, not backend persistence. Real reads
and the subsequent real PATCH are the persistence evidence.

The app has no client timeout, automatic retry, or Retry button, so no such
guarantees are claimed. Recovery uses existing reload, search/refetch, and Update
actions. GitHub-hosted Linux CI was not executed; local CI settings are checked
separately. Existing in-memory, fixed-port, and abrupt-termination limitations
remain. Phase 2C, accessibility testing, and visual regression were not started.

Changed: `apps/web/src/App.tsx`, `apps/web/src/api/orders.ts`,
`tests/regression/orders-client.test.ts`, `README.md`, `docs/architecture.md`,
and `docs/verification.md`. Added: `tests/ui/network-resilience.spec.ts`.

## Phase 2C checkpoint — October 12, 2026

Local verification used Node 22.22.0, npm 10.9.4, and macOS ARM64. The working
tree was clean on `feat/ui-failure-testing` before fetching origin/main and creating
`feat/accessibility-quality-gates` from merged Phase 2B commit `831a7f4`. HEAD still
matches that commit. All changes remain uncommitted; no push, merge, history rewrite,
or pull request was performed. This completes the planned Phase 2C engineering scope.

### Audit, defects, and test architecture

The screen already had English document metadata, one h1/main, wrapping filter
labels, order-specific native control names, scoped table headers, status/alert
feedback, text status badges, disabled updates, and terminal rows without actions.
Initial selected axe scans of loaded, controlled-loading, listing-error, and
PATCH-error states found no violations in any browser. Native forward/reverse
focus traversal also worked. The focused audit identified two additional issues:

- **Successful refetch lost keyboard focus.** Chromium and Firefox both reached
  a real processing update, displayed success, passed an independent persisted
  order read, then failed the retained selector-focus assertion. App now restores
  lost body focus after the refreshed listing renders, to the same order selector
  or search when no action remains. It preserves focus on another existing control.
  OrderRow adds only a stable select ID. The final nonterminal and terminal keyboard
  cases pass in all three browsers. The pre-fix WebKit case initially stopped at
  native button traversal; it is not counted as a pre-fix application reproduction.
- **Input/select borders were difficult to distinguish.** The original `#b5c5ca`
  measured 1.652508654:1 against `#f4f7f8` and 1.78:1 against white. The loaded-page
  contrast assertion failed in all three browsers before the CSS change. Changing
  the single existing border token to `#738a96` yields 3.36:1 and 3.62:1 respectively.
  The same regression passes afterwards. This is a focused project boundary guard;
  WCAG does not require a boundary for every kind of control. Existing focus-outline
  geometry/color and layout were retained. No backend or business-rule changes.

Eight new scenarios cover semantic loaded-page scans; keyboard search/filter and
empty-state scans; keyboard pending → processing and processing → shipped with real
API reads and focus restoration; forward/reverse focus and disabled/terminal actions;
held loading; listing alert; and usable failed-PATCH alert without false success.
The existing Phase 2B recovery/store-verification matrix is unchanged. See the
[audit and manual checklist](accessibility.md) for detailed state barriers and scope.

The exact new development dependency is `@axe-core/playwright@4.13.0`, with
axe-core 4.13.0 locked transitively. Registry metadata on October 12 reported this
as the current release (package modification October 9); its playwright-core peer
range is >=1.0.0. `npm ls` confirmed it shares playwright-core 1.64.0 with the existing
runner, without invalid peers. Only these two package entries were added to the lockfile.
Installed rule metadata confirms `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and
`wcag22aa`; the last selects target-size. There is no wcag22a tag in this engine.

The 29-line scan helper uses full-page AxeBuilder instances, asserts zero reported
violations, and attaches compact rule/impact/target/failure details plus incomplete
checks. No rule disablement, scan exclusion, snapshot baseline, retry, skip, timeout
increase, or separate framework was introduced. All scans follow exact DOM state
assertions; controlled loading uses a per-test gate released in finally.

Keyboard scenarios use key events and named focus checkpoints without mouse
clicks, selectOption, or page-wide blind Tab counts. Native type-ahead is committed
by blur before depending on the changed value. macOS WebKit uses Option+Tab for
buttons. Initial test-authoring runs exposed native popup handling, WebKit's
commit/button traversal, and a strict locator matching both success and loading.
The final sequences and scoped success locator correct those synchronization/test
issues; assertions were not relaxed to hide application failures. An initial
NodeNext default-import type error was resolved using the supported named AxeBuilder
export. Type-aware lint remains enabled with zero warnings.

### Executed checks

| Command/check | Actual final result |
| --- | --- |
| `npm ci` | Passed; 239 installed, 240 audited, zero reported vulnerabilities |
| `npm run typecheck` | Passed for API, frontend, tests, and tooling |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; emitted backend and built frontend after both fixes |
| `npm run test:regression` | Six passed; zero failed, skipped, or cancelled |
| `npm run test:a11y -- --reporter=list,html,json` | 24 passed; four workers, zero retries; 17.43 seconds |
| `npm run test:a11y -- --workers=4 --retries=0 --repeat-each=3 --reporter=list,html,json` | 72 passed; 45.67 seconds |
| `npm run test:api -- --reporter=list,html,json` | 23 passed; four workers; 2.22 seconds |
| `npm run test:ui -- --reporter=list,html,json` | 66 passed; four workers; 25.24 seconds |
| `CI=true npm test -- --reporter=list,html,json` | 89 passed; two workers; 40.01 seconds |
| `npm ls @axe-core/playwright axe-core @playwright/test playwright-core` | Passed; versions/peer sharing confirmed |
| JSON result/cleanup inspection | Passed; 274 executions, 276 unique deleted namespaces; no retries, skips, failures, flaky outcomes, or cleanup errors in these five final runs |
| `git diff --check` | Passed |

| Browser | New suite | New suite repeated three times | Complete UI suite | UI in combined CI-settings run |
| --- | --- | --- | --- | --- |
| Chromium | Eight passed | 24 passed | 22 passed | 22 passed |
| Firefox | Eight passed | 24 passed | 22 passed | 22 passed |
| WebKit | Eight passed | 24 passed | 22 passed | 22 passed |

Matching browser binaries were already installed; no download was needed. The
standalone API project and API portion of the combined run both passed all 23
existing cases. The original two UI workflows and all twelve Phase 2B resilience
cases passed in every browser in both UI/combined runs. GitHub-hosted Linux CI
was **not** executed; CI=true here is a local two-worker configuration check.

### Determinism, scans, and namespace cleanup

All five final JSON reports show fullyParallel true, zero project retries, one
passed result per execution with retry index zero, no errors, and no skipped/flaky
outcomes. Parallel-slot indices covered 0–3 in each local run and 0–1 in the combined
CI-settings run. The repeat report contains exactly three executions of every new
scenario/browser pair. Every scan records engine 4.13.0 and the five intended tags.
All **144 final full-page scans** had zero selected violations and zero incomplete
checks. These results do not establish untested WCAG or assistive-technology behavior.

| Final run | Passed executions | Unique namespaces confirmed deleted |
| --- | --- | --- |
| Accessibility suite | 24 | 24 |
| Accessibility suite repeated three times | 72 | 72 |
| API suite | 23 | 24 |
| UI suite | 66 | 66 |
| Combined CI-settings suite | 89 | 90 |
| Total | 274 | 276 |

Every execution has one namespace-cleanup attachment. IDs are unique within and
across all five reports; every entry has deleted true and no error. The unchanged
fixture records success only after DELETE 204 and scoped GET 404 with the exact
NAMESPACE_NOT_FOUND contract. The two extra namespaces belong to the two API-isolation
executions. The pre-fix focus report's three namespaces, border report's three,
and negative gate probe's three were also successfully removed.

Reports were saved by prefixing each command with PLAYWRIGHT_JSON_OUTPUT_FILE:

```sh
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2c-a11y.json npm run test:a11y -- --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2c-a11y-repeat.json npm run test:a11y -- --workers=4 --retries=0 --repeat-each=3 --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2c-api.json npm run test:api -- --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2c-ui.json npm run test:ui -- --reporter=list,html,json
CI=true PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/phase2c-full-ci.json npm test -- --reporter=list,html,json
```

These JSON files and `/private/tmp/phase2c-verification-summary.json` are ephemeral
local evidence, not shipped repository files. `npm run report` opens the final
combined HTML report, including scan and namespace-cleanup attachments.

### Accessibility gate failure evidence

A temporary specification appended one deliberately unlabelled input after six
real rows had loaded, then called the same scan/assertion helper. Running it through
npm test across all three browsers returned **exit 1 with three failed tests**.
Each reported rule **label**, impact **critical**, target
`#accessibility-gate-probe`, and a readable missing-label explanation. Each retained
trace, screenshot, compact scan details, and successful namespace cleanup. JSON is
`/private/tmp/phase2c-gate-probe.json`; copies of those failure artifacts are under
`/private/tmp/phase2c-gate-evidence`. The temporary spec and injected DOM were removed
before the five final passing runs. This probe is not an original application defect
or a permanent expected-failure test.

The existing workflow's single npm test step discovers accessibility.spec.ts through
all three existing UI patterns. Any selected violation or keyboard assertion fails
the normal job; no warning-only gate, duplicate accessibility invocation, or skipped
scenario is used. Typecheck, ESLint, build, standalone regressions, API/UI coverage,
zero retries, HTML reports, screenshots/traces, and cleanup uploads remain.

### Final review and limitations

The repository review checked test discovery, unchanged fixture ownership, focused
helper size, native-control synchronization, duplicate resilience coverage, preserved
API assertions, documentation counts, and accessibility claims. README was reduced
to a concise portfolio overview; detailed evidence lives here and audit/manual scope
in accessibility.md. No unrelated extension was implemented. The two targeted app
fixes are protected by failing-before/passing-after regressions.

Automated rules and role/text assertions cannot prove full WCAG compliance,
certification, or screen-reader compatibility/announcements. Manual checks remain
for VoiceOver/NVDA, native menus/OS keyboard preferences, zoom/reflow/text spacing,
forced colors, narrow-view focus clipping, touch behavior, and inclusive user testing.
Computed contrast checks assume this fixture's opaque solid surfaces. Existing
in-memory storage, fixed-port and abrupt-termination cleanup limitations remain.
Visual regression is deferred.

Sandbox restrictions blocked the first npm registry lookup (DNS), Git metadata
writes, Playwright loopback binding, and tsx's IPC socket. Required commands were
rerun with approved permissions; these were environment restrictions rather than
functional failures. Non-fatal color-environment warnings remained. Final tests ran
without timeout or retry changes.

Changed files: `.github/workflows/quality.yml`, `README.md`, `apps/web/src/App.tsx`,
`apps/web/src/components/OrderRow.tsx`, `apps/web/src/styles.css`, `docs/architecture.md`,
`docs/verification.md`, `package.json`, and `package-lock.json`. Added:
`docs/accessibility.md`, `tests/helpers/accessibility.ts`, and
`tests/ui/accessibility.spec.ts`. Fixtures, page object, Playwright configuration,
backend, seed expectations, and prior tests remain unchanged.

Recommended commit: `feat: add cross-browser accessibility and keyboard quality gates`.
Local verdict: **READY FOR PR**. Changes remain uncommitted for review.

## PR #4 focus follow-up — October 12, 2026

Work remains uncommitted on feat/accessibility-quality-gates at 76b6958. The branch
and working tree were inspected before changes; the tree was clean. No commit,
push, merge, new PR, or workflow rerun was performed during this investigation.

### CI evidence and diagnosis

The GitHub connector retrieved job 114887887195 and downloaded the unexpired
playwright-evidence artifact 11756599143 from
[run 38271885522](https://github.com/rmpetrov/playwright-ts-quality-framework/actions/runs/38271885522).
The job log confirms 88 passed and one failed: Linux WebKit's pending → processing
keyboard update. The failure is the selector-focus assertion after success, the
processing-row assertion, the absence of loading/errors, and the independent real
API GET all passed. The terminal-update counterpart passed in the same Linux run.

The trace records platform linux and Playwright 1.64.0. The browser PATCH returned
200 in 11.143 ms; the subsequent listing GET returned 200 in 4.443 ms. Decoding the
trace's incremental DOM snapshots shows post-refetch row headers and button text
referencing original DOM-node snapshots. In particular, the post-update snapshot
at monotonic 43646.415 references the original ORD-1001 row header from 43138.515.
Playwright's installed snapshot serializer stores its reference cache on individual
DOM nodes, so this is evidence of retained nodes, not just equivalent markup.
The table remained present in the recorded snapshots and its Update became disabled.
A refetch therefore does not guarantee unmount/remount or body focus.

The confirmed application defect is a restoration policy based solely on
`document.activeElement === document.body`, followed by unconditional consumption
of the pending request. It cannot restore focus still owned by a retained submitting
control or another document fallback. The trace supports the fast/retained-table
lifecycle, but does **not** record the actual activeElement at the effect: whether
Linux WebKit returned the disabled submitter, documentElement, or another value is
not directly established. Retained-submitter focus is an inference, not a measured
Linux browser fact. See the [activeElement reference](https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement)
for document fallback behavior and [React effects](https://react.dev/reference/react/useEffect)
for effect/commit semantics.

Thirty unchanged local executions passed: ten per browser, including ten macOS
WebKit runs. These do not reproduce or invalidate the Linux failure. This host is
macOS ARM64 and has no available Docker/Podman/Colima/Orb/Lima Linux runtime. A new
GitHub Actions run after the user reviews and pushes the patch is required to
validate the original Linux WebKit environment. No GitHub success is claimed.

### Minimal patch and regression protection

App now records the submitting element and current orders reference at activation,
before disabling controls or awaiting PATCH. Restoration waits for the update and
listing to settle and for a fresh orders array (or listing error); it no longer
requires a transient loading render. It handles the original submitter, body,
documentElement, or no active element, restores the order selector when available,
and retains search as the terminal/missing-row fallback. A focus-capture handler
cancels the request when the user focuses a different element, including during
PATCH; successful PATCH does not re-arm a cancelled request. Failed PATCH clears it.
No native controls, layout, backend rules, or OrderRow code changed.

The original toBeFocused assertions and terminal fallback case remain. One extra
parameterized case holds a real PATCH with a test-local promise, uses Shift+Tab to
move intentionally to the still-usable filter while actions are disabled, releases
the PATCH, then verifies the refreshed processing row, real persistence, and retained
visible filter focus. The gate releases in finally and routes drain during teardown.
No test forces application focus, sleeps, delays, retries, or browser skips were added.
Current documentation counts now reflect nine accessibility scenarios, 23 UI
scenarios per browser, and 92 total Playwright executions.

### Actual local verification

| Check | Result |
| --- | --- |
| npm run typecheck | Passed for all four TypeScript configurations |
| npm run lint | Passed with zero warnings |
| npm run build | Passed after the final application patch |
| npm run test:regression | Six passed, no failed/skipped/cancelled tests |
| Focused update/navigation checks, three browsers | 12 passed; four per browser, four workers; 13.36 seconds |
| Affected WebKit test, repeat-each=20 and retries=0 | 20 passed; four workers; 18.36 seconds |
| Complete npm test with CI=true | 92 passed: API 23, Chromium 23, Firefox 23, WebKit 23; two workers; 27.99 seconds |
| JSON/cleanup inspection | All 124 post-patch executions passed once with retry index zero; no skips, flaky results, errors, or failed cleanup; 125 unique namespaces deleted |
| git diff --check | Passed |

The repeated WebKit test used the final built application. The combined suite
includes every existing API and resilience case, the terminal fallback, and the
new intentional-focus regression. Reports confirm fullyParallel true and zero
project retries. All four parallel slots were exercised in focused/repeated runs;
both slots were exercised in the CI-settings run. All 56 scans in those three
reports had no selected violations or incomplete results. Fixture teardown verified
DELETE 204 then scoped GET 404 / NAMESPACE_NOT_FOUND for every owned namespace.

```sh
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/pr4-focus-after.json npm test -- tests/ui/accessibility.spec.ts --grep 'keyboard.*update' --project=chromium --project=firefox --project=webkit --retries=0 --reporter=list,html,json
PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/pr4-webkit-repeat.json npm test -- tests/ui/accessibility.spec.ts --project=webkit --grep 'keyboard pending to processing.*restores focus' --repeat-each=20 --retries=0 --reporter=list,html,json
CI=true PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/pr4-full-ci.json npm test -- --reporter=list,html,json
```

JSON summaries are in /private/tmp/pr4-verification-summary.json. Downloaded CI
artifacts are under /private/tmp/phase2c-ci-failure. These are ephemeral local files;
the repository's final HTML report comes from the complete passing local run.

Changed: apps/web/src/App.tsx, tests/ui/accessibility.spec.ts, README.md,
docs/accessibility.md, docs/architecture.md, and this verification record.
Recommended commit: `fix: preserve update focus across retained and replaced order rows`.
Local verification passed; original Linux CI resolution remains pending a new run.
