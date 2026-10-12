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
