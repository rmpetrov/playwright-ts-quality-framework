# playwright-ts-quality-framework

A TypeScript/Playwright portfolio project demonstrating explicit assertions,
typed fixtures, real HTTP API testing, and parallel-safe test data ownership.
The small Order Management Console is a deterministic test fixture, not a
production application or a claim of professional project experience.

## Run locally

Use Node **22.22.0** (`nvm use`, if available) and npm. No credentials or external
services are needed at runtime. Initial dependency and browser downloads need
network access.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run typecheck
npm run lint
npm run build
npm run test:regression
npm test
```

On Linux, install browser system dependencies with
`npx playwright install --with-deps chromium firefox webkit`.

Tests start the **built** Fastify server and Vite preview server on
`127.0.0.1:3001` and `127.0.0.1:5173`, then stop them automatically.
Build before testing after application changes. Those ports must be free;
existing servers are deliberately not reused.

For interactive development:

```sh
npm run dev
```

Open [the local console](http://127.0.0.1:5173). Development uses a default seeded
store; restart the API to reset it. Stop development servers before running tests.

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Strict checking for backend, frontend, tests, and configuration |
| `npm run lint` | Type-aware ESLint; warnings fail the command |
| `npm run build` | Emit backend JavaScript and build frontend assets |
| `npm run test:api` | 23 API scenarios, including status transitions, query boundaries, and namespace isolation |
| `npm run test:ui` | Two scenarios in each of Chromium, Firefox, and WebKit |
| `npm run test:isolation` | Focused namespace-isolation test |
| `npm run test:regression` | Four standalone checks: test-support configuration and frontend response handling |
| `npm test` | All 29 Playwright executions: 23 API and 6 UI |
| `npm run report` | Open the last HTML report |

## Architecture

- One npm package and one lockfile; exact direct dependency versions.
- `apps/api`: Fastify, JSON Schema request validation, transition rules, and in-memory seeds.
- `apps/web`: React/Vite screen with filtering, search, status updates, and loading/error/empty states.
- `tests/fixtures`: test-owned namespaces, API contexts, browser headers, and checked teardown.
- `tests/data`: independently defined expected values and a deterministic order expectation factory.
- `tests/pages`: one focused `OrdersPage`; assertions remain in specifications.
- `tests/api`, `tests/ui`: real HTTP tests, with no response mocking or arbitrary sleeps.
- `tests/regression`: Node's test runner, isolated Fastify injection, and focused client response checks.
- `docs`: [architecture and tradeoffs](docs/architecture.md), [actual verification](docs/verification.md).

The browser's `/api` requests pass through Vite to Fastify. Both development and
preview proxies preserve `x-test-namespace`. Test API contexts send the same
namespace directly to Fastify. A UI update followed by an API read checks this path.

Every Playwright test creates a UUID namespace containing six fresh seeded orders and three
customers. Tests share neither mutable seed objects nor a global reset endpoint.
Fixture teardown deletes every owned namespace, verifies subsequent reads return
404, and attaches cleanup evidence to the report, including after assertion failures.
The isolation test updates `ORD-1001` in one namespace and checks that the same
order remains pending in another.

Namespace-management routes under `/__test` are registered only when
`ENABLE_TEST_SUPPORT=true` and `NODE_ENV=test`. The server rejects enabling support
outside test mode. In test mode, application API requests require an existing
namespace. Normal startup exposes no namespace-management routes. Both servers
bind to loopback. Namespace IDs provide test isolation, not authentication.

## API and business rules

| Endpoint | Response |
| --- | --- |
| `GET /health` | 200, readiness |
| `GET /api/orders?status=pending&search=ava` | 200, `{ orders: [...] }` |
| `GET /api/orders/:id` | 200, order; 404 if missing |
| `PATCH /api/orders/:id/status` | 200, updated order; body `{ "status": "processing" }` |

Search matches order ID or customer name case-insensitively; surrounding whitespace
is trimmed. The decoded search value accepts at most **100 characters before
trimming**. Search and status filters combine. Results preserve seed order.
Only `search` and `status` query parameters are accepted. Status must be one of
the four values below; repeated search/status parameters are rejected as arrays.
Totals use integer cents; dates are fixed ISO timestamps. Customer data appears
within order responses; there is no customer-management screen.

Allowed transitions: `pending → processing/cancelled`,
`processing → shipped/cancelled`. `shipped` and `cancelled` are terminal.
Same-status updates and all other transitions return **409**.

All error responses contain `{ code, message }`:
invalid schemas return **400 / VALIDATION_ERROR**, malformed JSON returns
**400 / BAD_REQUEST**, missing orders return **404 / ORDER_NOT_FOUND**, and
prohibited transitions return **409 / INVALID_TRANSITION**. Unknown routes return
**404 / ROUTE_NOT_FOUND**. Additional request fields and type coercion are rejected.
Schema failures use the exact message `Request validation failed.`; transition
failures use `Cannot change status from <current> to <requested>.`.

## Phase 2A coverage

The transition specification explicitly lists all four allowed status pairs and
all twelve rejected pairs, grouped by starting status. It checks complete PATCH
responses, independent GET persistence, and unchanged unrelated orders. Rejected
updates cover terminal states, same-status requests, skipping processing, and
moving processing back to pending; each checks the exact 409 contract and the
unchanged order/listing. A separate workflow follows pending → processing → shipped
through HTTP and verifies that all further updates are rejected.

Query tests cover case-insensitive ID/customer search, surrounding whitespace,
combined and status-only filters, and empty results. Successful queries are repeated
to check deterministic contents and ordering. Boundary checks accept 99/100-character
searches and reject 101 characters before trimming. Negative cases check unsupported
statuses, unknown parameters, and repeated search/status keys, with exact 400 errors
and an unchanged full listing. Expectations live in test data; tests do not import
application seed data or transition rules.

Every parameterized test receives its own namespace through the existing typed
fixture. Related rejected requests within a test share only that test's store and
check its contents after each request. Full parallel execution and zero retries
remain enabled. To run the extended API suite repeatedly with four workers:

```sh
npm run build
npm run test:api -- --workers=4 --retries=0
npm run test:api -- --workers=4 --retries=0
```

Run these commands sequentially because application ports are fixed. Namespace
cleanup evidence is attached to each test's report.

## CI and evidence

`.github/workflows/quality.yml` runs clean installation, type checking, linting,
build, standalone regressions, browser installation, and the Playwright suite on pull requests and pushes to
`main`. It uses two workers and uploads reports and test artifacts.

Playwright retries are **0 locally and in CI**. Failed attempts fail the test run;
the project does not implement a separate flaky-test detection gate.
HTML reports include namespace-cleanup attachments. Traces are retained on failure;
failed UI tests also capture screenshots. Generated artifacts are Git-ignored.

## Scope and limitations

Data is in memory and disappears on restart. The application has no authentication,
database, pagination, payments, or deployment. Abruptly killing the test process
can prevent teardown; restarting its disposable backend clears remaining namespaces.
Only one test invocation can use the fixed ports at a time.

Phase 2A covers the complete status-pair matrix and selected query boundaries;
other error paths, Unicode search semantics, and competing same-order updates
remain outside the automated coverage. The frontend checks order response shapes
and uses readable fallbacks for invalid or empty bodies. See
[verification](docs/verification.md) for dated local results and CI verification limits.

Accessibility, visual regression, and network failure injection remain deferred.
