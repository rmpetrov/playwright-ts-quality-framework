# Test scenarios and coverage

Start with the [README](../README.md) for positioning and setup, the
[architecture](architecture.md) for ownership and HTTP paths, and the
[verification record](verification.md) for executed evidence. Assertions use
[test-owned expected data](../tests/data/orders.ts), never the application's seed
or transition implementation to calculate expected results.

## Four featured scenarios

### Parallel namespace isolation

**Source:** [namespace-isolation.spec.ts](../tests/api/namespace-isolation.spec.ts),
`mutating one namespace does not change another namespace`;
[typed fixture and teardown](../tests/fixtures/test.ts).

Parallel workers must be able to mutate identically seeded orders without leaking
state between tests. The scenario creates a second UUID namespace through the
same owning fixture and opens a separate APIRequestContext with its header.

Both stores initially return the full expected pending order. A real PATCH changes
namespace A to processing; independent GETs then assert A's full updated order
and B's full unchanged order. The fixture's finally block deletes both namespaces,
checks DELETE 204 followed by scoped GET 404 / NAMESPACE_NOT_FOUND, and attaches
cleanup evidence even after assertion failure.

**Limit:** requests within this example are sequential. It verifies store separation;
parallel workers and unique/deleted namespaces are evidenced separately in the
[recorded suite runs](verification.md). Neither establishes safe competing writes
to the same order or authentication between users.

### Complete order-status transition coverage

**Source:** [order-transitions.spec.ts](../tests/api/order-transitions.spec.ts),
the allowed/rejected matrices and
`fulfils a pending order through processing and shipped, then rejects further updates`.

Tests must catch business-rule defects without copying the backend's transition
map. Explicit test-owned cases cover all 16 pairs among pending, processing,
shipped, and cancelled, including same-status and terminal transitions.

Four separate allowed cases assert PATCH 200, the full response, an independent
GET, and the full listing with only the intended order changed. Four rejection
cases group all twelve prohibited pairs by starting status: every operation asserts
the exact 409 INVALID_TRANSITION contract, the target order, and the unchanged full
store. A ninth scenario performs pending → processing → shipped through real HTTP,
then rejects every further status update with state checks after each rejection.

**Limit:** complete means all pairs for the four implemented statuses. This checks
state held by one running in-memory backend, not restart durability, concurrent
writers, or unimplemented business rules.

### Network failure injection with real backend verification

**Source:** [network-resilience.spec.ts](../tests/ui/network-resilience.spec.ts),
`status update recovers from ${failure.name} without false persistence`.

A frontend can report failure while still showing false success or stale controls.
The parameterized example deliberately blocks forwarding the browser PATCH and
checks real backend state independently through the direct API fixture.

Five cases inject 503 JSON, a simulated 409 conflict, a transport abort, malformed
200 JSON, or a structurally invalid 200 order. A test-local promise holds the
response while assertions check disabled controls and pending status. After release,
tests assert the exact alert, no success, unchanged displayed status, and re-enabled
controls; the intercepted header and body must match the test's namespace and update.
Direct GETs bypass page.route and verify the target and entire real store are unchanged.
Removing interception and clicking Update performs a real PATCH; a separate full-store
GET proves the processing status was stored and other orders stayed unchanged.

**Limit:** fulfilled/aborted requests never reach Fastify. They demonstrate frontend
handling and absence of unintended writes, not backend generation of 503/409 errors,
a real write conflict, or database persistence. Recovery is an explicit user update;
the app has no automatic retry, Retry button, or client-side timeout.

### Accessibility and keyboard quality gates

**Source:** [accessibility.spec.ts](../tests/ui/accessibility.spec.ts),
`keyboard ${transition.from} to ${transition.to} update announces success, persists, and …`;
[axe helper](../tests/helpers/accessibility.ts).

A successful update can preserve data while losing a keyboard user's position when
rows refetch. Three generated cases use actual keys and semantic focus checkpoints
to check pending → processing, processing → shipped, and intentional focus movement
during a held real PATCH.

Each case commits native select type-ahead on blur, reaches the enabled Update
button, activates it with Enter, asserts exact status text/refreshed rows, and reads
the full updated order directly from Fastify. Focus returns to the updated selector,
or search for a terminal row; if the user moved to the filter while PATCH was pending,
that visible focus is preserved. A fresh full-page axe scan follows the established
UI state. Other scenarios cover loaded semantics/boundary contrast, keyboard
search/filter/empty results, forward/reverse focus and skipped disabled controls,
held loading, listing error, and failed PATCH.

**Limit:** the test name's “announces” is verified as visible status text and semantic
roles, not measured screen-reader speech. Selected WCAG 2.0/2.1 A/AA and 2.2 AA
rules, solid-color contrast, and browser focus checks do not establish complete WCAG
compliance or native OS/assistive-technology behavior. The
[accessibility audit](accessibility.md) owns the exact engine/tag scope, historical
findings, and manual checklist.

## Coverage inventory

Counts describe discovered scenarios, not individual HTTP assertions or every
parameterized transition pair. Each UI scenario runs once in each browser.

| Layer / source | Scenarios | Executions in npm test |
| --- | ---: | ---: |
| [API transitions](../tests/api/order-transitions.spec.ts) | 9 | 9 |
| [API queries](../tests/api/order-queries.spec.ts) | 11 | 11 |
| [API payload/missing order](../tests/api/orders.spec.ts) | 2 | 2 |
| [API isolation](../tests/api/namespace-isolation.spec.ts) | 1 | 1 |
| [UI search/filter and real update/reload](../tests/ui/orders.spec.ts) | 2 | 6 |
| [UI network resilience](../tests/ui/network-resilience.spec.ts) | 12 | 36 |
| [UI accessibility/keyboard](../tests/ui/accessibility.spec.ts) | 9 | 27 |
| **Playwright total** | **46** | **92: API 23 + UI 69** |
| [Standalone regressions](../tests/regression/) | 6 | Separate Node test run |

Query scenarios check case-insensitive ID/customer search, trimming, combined and
status-only filters, exact ordered arrays, repeated deterministic reads, and empty
results. Boundaries use 99, 100, and 101 decoded characters and confirm validation
precedes trimming. Invalid statuses, unknown parameters, and repeated keys assert
the exact 400 contract and unchanged seed contents through real HTTP.

Six standalone regressions use Node's test runner through the existing tsx dependency:
one checks test-support configuration with Fastify injection, and five exercise
frontend parsing, network fallback messages, and preserved cancellation with
synthetic fetch responses. They do not start the Playwright application servers.

## Synchronization and failure ownership

[OrdersPage](../tests/pages/orders.page.ts) wraps repeated navigation/interactions;
assertions remain in specifications. Role/name locators and table-body row scopes
provide semantic checkpoints. Playwright assertions and request/DOM events establish
states without arbitrary sleeps or application instrumentation.

The network suite scopes listing routes to the browser origin and exact pathname,
and update routes to the exact order/status URL; handlers check HTTP methods.
Namespace lifecycle calls, direct API reads, and assets remain outside interception.
Every test owns its routes, gates, and observations. Held requests release in finally;
route removal waits for handlers, including on assertion failure.

Five listing cases check JSON 500, HTML 503, malformed 200 JSON, an invalid order
among valid orders, and transport abort. They assert exact alerts, no partial table,
usable controls, no uncaught page errors, and real seeded rows after route removal/reload.
A held real listing proves loading remains visible until response release.
The obsolete-request scenario captures a genuine older pending-filter response
with route.fetch, waits for newer real search results, releases the old response,
and confirms cancellation via requestfailed and preservation of the latest rows.

Accessibility scans assert the intended loaded, filtered, empty, loading, success/
terminal, listing-error, or update-error state first. No rule or element is excluded.
Attachments include violations and incomplete checks; every selected violation
fails the gate, while incomplete checks require human assessment. Native select
behavior is committed on blur; macOS WebKit uses Option+Tab to include buttons.

## Running the tests

Complete the [quick start](../README.md#quick-start) first. Build after application
changes, keep ports 3001/5173 free, and run suites sequentially. Playwright starts
built servers and does not reuse manual servers. The
[runner configuration](../playwright.config.ts) enables fullyParallel, four local
workers/two CI workers, and zero retries.

| Command | Purpose |
| --- | --- |
| `npm run test:regression` | Six standalone Node configuration/client regressions |
| `npm run test:api` | 23 real HTTP API scenarios |
| `npm run test:ui` | 23 UI scenarios × three browsers = 69 executions |
| `npm run test:a11y` | Nine accessibility/keyboard scenarios × three browsers = 27 executions |
| `npm run test:isolation` | One namespace-isolation scenario |
| `npm test` or `npm run test` | The same complete 92-execution Playwright suite |
| `npm run report` | Open the latest local HTML report |

To exercise repeated parallel accessibility execution with no retries:

```sh
npm run test:a11y -- --workers=4 --retries=0 --repeat-each=3
```

That command now discovers 81 executions. Historical 72-execution evidence predates
the ninth accessibility scenario; dated counts remain in the verification record.
For interactive development, run `npm run dev` and open
[the local console](http://127.0.0.1:5173). Normal startup uses the default store
without test-support routes; restarting the API resets that store.
