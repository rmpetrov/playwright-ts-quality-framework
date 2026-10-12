# Architecture decisions

## Purpose and boundaries

The automation framework is the primary deliverable. The Order Management Console
provides controlled browser and HTTP behavior without external accounts or services.
This MVP is a learning/portfolio artifact; it makes no production-use claims.

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
fallback messages for invalid JSON, empty errors, or unexpected response bodies.

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
responses from replacing the latest result.

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

The API project runs five representative scenarios and one isolation scenario once.
The same two UI scenarios run independently in Chromium, Firefox, and WebKit.
`fullyParallel` is enabled with four local workers and two CI workers. Retries are
zero everywhere. No special flaky-test classification policy is claimed.

OrdersPage encapsulates navigation and repeated interactions; assertions stay in
specifications. Locators use accessible roles/names plus a table-body scope for row
selection. Synchronization uses Playwright locator assertions and auto-waiting.
Playwright scenarios call real local HTTP routes; no `route.fulfill`, mocks, or arbitrary sleeps.

Four standalone regressions run through Node's built-in test runner using the existing
tsx dependency. One checks the test-support configuration with Fastify injection;
three exercise frontend parsing with test-local synthetic fetch responses. These
checks are separate from the 12 real-HTTP Playwright executions and do not need
running application servers or additional test frameworks.

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

Phase 1 includes tooling, the fixture application, namespace-aware fixtures,
representative tests, local verification, and CI/documentation. Future work needs
review first. The recommended next step is a small independent transition and
input-boundary test matrix; accessibility, visual testing, and network failure
injection remain planned extensions.
