# Architecture decisions

## Purpose and boundaries

The automation framework is the primary deliverable. The Order Management Console
provides controlled browser and HTTP behavior without external accounts or services.
This project is a learning/portfolio artifact; it makes no production-use claims.

```text
UI specifications → OrdersPage → isolated browser context
                                   ↓ x-test-namespace
                            Vite /api proxy
                                   ↓ same header
API specifications → APIRequestContext → Fastify /api → owned namespace store

Typed namespace fixture → Fastify /__test → create/delete fresh seeded store
```

## One package, explicit separation

There is one npm package and one lockfile. The API, frontend, test suite, and
tooling each have a strict TypeScript configuration suited to their runtime.
The API compiles with NodeNext modules, the frontend uses Vite/Bundler resolution,
and tests use Playwright's TypeScript transformation plus separate `tsc` checking.
ESLint checks types and floating promises. Application data/rules are never
imported by tests to calculate expected results.

DTO declarations are small and local to each application boundary. Sharing a
business-rule implementation with tests would compromise their independence;
introducing schema code generation is unnecessary for this API's current size.
The frontend validates the small order response shape locally and uses operation-specific
fallback messages for invalid JSON, empty errors, unexpected response bodies, and
network failures. Expected listing cancellation preserves its original rejection.

The dependency set uses React 19, Vite 8, Fastify 5, and Playwright 1.64. TypeScript
6.0.3 was selected within typescript-eslint 8.71.1's declared supported range
(`>=4.8.4 <6.1.0`), rather than choosing the registry's latest TypeScript release
without checking compatibility. Exact direct versions and transitive resolutions
are recorded in `package-lock.json`. Node 22.22.0 is the local/CI baseline.

## Minimal application

Fastify handles HTTP and JSON Schema validation. In-memory stores contain customers
and orders; routes join customer data into order responses. A small transition map
enforces business rules. The frontend displays server-confirmed updates and
refetches the current filtered listing. AbortController prevents obsolete search
responses from replacing the latest result. Listing errors suppress invalid data;
update errors use separate state so existing rows and controls remain usable.

The API error handler converts schema errors, malformed JSON, business errors,
and unknown routes into `{ code, message }` responses. Invalid schemas use 400,
missing resources use 404, and prohibited state transitions use 409. Unexpected
errors are logged and return a generic 500. Fastify's AJV coercion, default
injection, and additional-field removal are disabled for explicit input validation.

The UI presents valid next-status choices for convenience; the backend remains
authoritative and validates every update. Tests explicitly verify an invalid direct
HTTP transition. The fixture app provides neither durable state nor concurrency
control for competing updates to the same order.

## Namespace lifecycle and ownership

`createNamespace` is a **test-scoped** fixture. Its factory allocates a UUID and
creates a store through `POST /__test/namespaces`. The default `namespace` fixture
uses it once; the isolation scenario uses it again for its second store. Each
creation receives fresh objects with the same fixed seed contents.

The overridden `request` fixture constructs an APIRequestContext with the namespace
header and API base URL. The `extraHTTPHeaders` fixture supplies that same namespace
to Playwright's normal browser-context fixture. Contexts are not shared by workers.
Vite forwards `/api` unchanged in development and preview, including custom headers.
UI tests run against built assets and a compiled backend.

The UI update test reads the result directly through the test's API context. If
the browser uses another store or the proxy loses the header, that assertion fails.
The isolation test verifies identical starting orders, changes namespace A, and
asserts A is processing while B remains pending. Both assertions use explicit
test-owned expected objects.

The owning fixture runs teardown in `finally`, attempts deletion for **every**
owned namespace, checks DELETE returned 204, and checks a subsequent scoped GET
returns 404 with `NAMESPACE_NOT_FOUND`. It attaches results and fails teardown if
any deletion verification fails. API contexts are disposed separately. No global
dataset reset, serial suite, or shared worker-level mutable data is needed.

Test-support endpoints are outside `/api`. Server startup requires both
`NODE_ENV=test` and `ENABLE_TEST_SUPPORT=true` to enable them; enabling support
outside test mode fails startup. Disabled support leaves those routes unregistered.
The startup guard is a small function shared with the standalone configuration
regression. That test builds and closes its own apps without changing process.env
or using the Playwright server.
Test-mode `/api` routes reject a missing or unknown namespace rather than falling
back to a default store. `/health` remains available for server readiness.

Both servers bind to `127.0.0.1`. Test-support routes have no authentication and
must not be exposed as a remotely accessible service. Namespaces are test isolation,
not a security boundary. Process termination may skip teardown; disposable backend
shutdown removes remaining in-memory stores. Parallel workers are supported, while
concurrent independent suite invocations need distinct ports and are outside the MVP.

## Test layers and diagnostics

The API project runs 23 scenarios once: nine transition scenarios, eleven query
scenarios, two existing payload/missing-order scenarios, and one isolation scenario.
The same fourteen UI scenarios run independently in Chromium, Firefox, and WebKit:
two real workflows and twelve network-resilience scenarios.
`fullyParallel` is enabled with four local workers and two CI workers. Retries are
zero everywhere. No special flaky-test classification policy is claimed.

OrdersPage encapsulates navigation and repeated interactions; assertions stay in
specifications. Locators use accessible roles/names plus a table-body scope for row
selection. Synchronization uses Playwright locator assertions and auto-waiting.
API scenarios and ordinary UI workflows call real local HTTP routes. The focused
network suite fulfills/aborts selected browser requests and uses direct real API
reads to distinguish UI error handling from persisted backend state. No arbitrary sleeps.

Phase 2A uses two focused specifications for transitions and order queries. Four
parameterized tests check allowed status pairs, and four more group the twelve
rejected pairs by starting status. A ninth scenario checks fulfilment through
pending → processing → shipped and terminal rejection after real HTTP mutations.
The cases list expected outcomes explicitly, independently of the application's
transition map. Test-owned data describes all six full seeded order responses.
Successful transitions are confirmed by a separate GET and a full listing;
each rejected operation confirms both the target and full store remain unchanged.

Query cases check case-insensitive search, trimming, combined/status-only filters,
and empty results against explicit ordered response arrays. They repeat successful
queries to verify deterministic responses. A boundary test checks 99, 100, and 101
decoded search characters, including that validation precedes trimming. Negative
query tests send unsupported statuses, unknown parameters, and repeated keys that
express arrays through HTTP; they assert the exact 400 error contract and unchanged
seed contents. They avoid expectations about parser implementation details.

Each generated test uses the existing test-scoped namespace fixture; no matrix
shares a worker-level store. Related requests within one test verify state after
each operation. The original pending transition, skipped transition, and combined
query cases now live in these matrices without duplicate standalone tests.

Six standalone regressions run through Node's built-in test runner using the existing
tsx dependency. One checks the test-support configuration with Fastify injection;
five exercise frontend parsing, network rejection messages, and preserved cancellation
with test-local synthetic fetch responses. These
checks are separate from the 65 Playwright executions and do not need
running application servers or additional test frameworks.

### Network interception and synchronization

`tests/ui/network-resilience.spec.ts` owns every route, gate, and observation per
test. URL predicates include the browser origin and exact listing pathname;
PATCH interception includes the exact order/status URL. Handlers check HTTP methods.
Namespace-management endpoints, individual real API reads, and assets are outside
the route scope. Browser headers and direct API contexts retain the original
typed namespace fixture and its checked cleanup attachment.

Five listing cases cover 500 with the existing JSON contract, 503 HTML, malformed
200 JSON, an invalid order mixed with a valid order, and transport abort. Assertions
check exact public alerts, no table/partial results, intact interface, and no uncaught
page errors. Removing the route and reloading restores real seeded rows.

Five PATCH cases cover 503 JSON, the documented 409 / INVALID_TRANSITION contract,
transport abort, malformed 200 JSON, and a structurally invalid 200 order. The 409
simulates a stale client's conflict response; it does not create a real competing
write or alter business rules. Every failed PATCH is fulfilled or aborted without
`route.fetch`/`continue`. Tests check disabled controls while pending, enabled controls
after failure, unchanged displayed status, and no success notice. Direct API GETs
verify the target and entire store remain unchanged. Removing interception and
clicking Update again performs a real PATCH, checked by a separate full-store read.
Malformed mock successes are rejected; no mocked success is used as persistence evidence.

Promise gates hold the initial listing and failed PATCH responses until assertions
complete. Each test releases gates in `finally` and waits for route handlers during
removal, including on failure. The race test captures a real pending-filter response
using `route.fetch`, changes search, waits for the newer real response/rows, then
releases the old response. A browser `requestfailed` event confirms cancellation;
the latest rows and absence of an alert are checked after release. These are
request/DOM barriers, with no wall-clock delays or application instrumentation.

The suite verifies supported reload/refetch/update recovery, not client timeouts,
automatic retries, offline behavior, server failure generation, or write conflicts.
The application has no Retry button, automatic retry, or client-side timeout.

The default reporter emits console and HTML results. Failed tests retain traces,
failed browser tests capture screenshots, and all tests attach namespace-cleanup
evidence. The loopback servers are started/stopped by Playwright with readiness
URLs. Existing servers are not reused, preventing accidental testing of a manual
server lacking test support or stale code. Build is required before application tests.

## CI and incremental delivery

One GitHub Actions job uses the pinned Node baseline, `npm ci`, type checking,
ESLint, build, and matching Playwright browsers with Linux dependencies. It runs
the standalone regressions and Playwright suite and uploads evidence on completion or failure. There is no sharding,
deployment, database service, secret configuration, or remote repository requirement.
The workflow uses these actions; their maintainers document usage here:
[checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node), and
[upload-artifact](https://github.com/actions/upload-artifact).

Phase 1 established tooling, the fixture application, namespace-aware fixtures,
representative tests, and CI/documentation. Phase 2A adds the independent transition
matrix and selected query boundaries without application, fixture, dependency,
or runner changes. The existing CI command discovers the new API specifications
automatically. Phase 2B adds focused browser failure injection and minimal fixes
for transport messages and update-error visibility, without backend, fixture,
dependency, runner, or CI changes. Existing UI project patterns discover the new
specification automatically. Future phases require review first; accessibility and
visual testing remain deferred. Other error routes, Unicode search semantics,
and concurrent writes to the same order remain outside coverage.
