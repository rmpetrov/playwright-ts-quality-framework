# Playwright TypeScript Quality Framework

A Senior SDET portfolio demonstrating independent API contracts, parallel-safe test
data, cross-browser resilience, and accessibility gates against a local Order
Management Console. The React/Fastify app provides controlled behavior to test;
this is a portfolio artifact with no production-use or professional-experience claims.

## Engineering highlights

- **Parallel-safe ownership:** typed fixtures create UUID namespaces, carry the same
  header through browser and API contexts, and verify deletion even after test failure.
- **Independent API expectations:** all 16 order-status pairs are explicit test data;
  separate HTTP reads verify accepted changes and unchanged state after rejection.
- **Resilience with backend evidence:** 12 browser scenarios inject HTTP, payload,
  and transport failures, control loading/races, and verify recovery against Fastify.
- **Accessibility and keyboard gates:** nine scenarios per browser combine selected
  axe rules with real key events, visible focus, contrast, and focus restoration.
- **Cross-browser execution:** 23 API scenarios plus 23 UI scenarios in each of
  Chromium, Firefox, and WebKit produce 92 Playwright executions; retries are zero.
- **Reviewable diagnostics:** HTML reports, failure traces/screenshots, axe findings,
  and checked namespace-cleanup attachments accompany the CI quality gate.

## Architecture at a glance

Browser tests drive React served by Vite; browser `/api` requests reach Fastify
through Vite's proxy. Direct API checks bypass the browser and proxy. Both paths
select the same in-memory namespace, owned and deleted by a test-scoped fixture.
See the [Mermaid architecture diagram and source map](docs/architecture.md#runtime-and-test-paths).

## Four featured scenarios

| Source | Engineering challenge and evidence | Meaningful limit |
| --- | --- | --- |
| [Parallel namespace isolation](tests/api/namespace-isolation.spec.ts) | Two independently owned stores start with identical data. A real PATCH changes A to processing while independent GETs confirm B remains pending; the owning fixture verifies both deletions. | This scenario mutates stores sequentially; parallel suite runs provide separate execution evidence. It does not test competing writes to one order. |
| [Complete order-status transitions](tests/api/order-transitions.spec.ts) | Test-owned expectations cover four allowed and twelve rejected status pairs. Real PATCH/GET/list checks verify accepted state, exact 409 contracts, unchanged stores after rejection, and terminal behavior after fulfilment. | Complete for the four implemented statuses; storage remains in memory. |
| [Network failure and real backend verification](tests/ui/network-resilience.spec.ts) | A parameterized update scenario fulfills or aborts PATCH without forwarding it, checks usable error state, and independently reads the unchanged real store. Removing interception allows a real update, verified by a full-store GET. | Injected responses prove frontend handling, not backend error generation; reload/update recovery does not establish automatic retries or offline support. |
| [Accessibility and keyboard quality gates](tests/ui/accessibility.spec.ts) | Keyboard update cases verify native control traversal, real API state, restored focus or preserved intentional focus, and a full-page axe scan after the asserted UI state. Loaded, filtered, empty, loading, and error states extend the gate. | Selected automated rules and focus checks do not establish full WCAG compliance or screen-reader announcements. |

Read the [scenario guide and coverage inventory](docs/testing.md) for exact test
names, synchronization, assertions, and execution commands.

## Technology stack

TypeScript 6, Playwright Test 1.64, React 19, Vite 8, Fastify 5,
`@axe-core/playwright` 4.13, ESLint, and GitHub Actions. Standalone regressions use
Node's test runner through tsx. One npm package and lockfile pin direct dependencies;
Node **22.22.0** is the local/CI baseline ([package](package.json), [.nvmrc](.nvmrc)).

## Quick start

Use Node 22.22.0 (`nvm use`, if available) and npm. No credentials or external runtime
services are needed; initial package/browser downloads need network access.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run typecheck
npm run lint
npm run build
npm run test:regression
npm test
```

These commands were verified locally on macOS; the
[dated verification record](docs/verification.md#portfolio-presentation-checkpoint--october-12-2026)
records results. On Linux, use `npx playwright install --with-deps chromium firefox webkit`,
as the [quality workflow](.github/workflows/quality.yml) does.

Tests start the compiled API and Vite preview on `127.0.0.1:3001` and
`127.0.0.1:5173`, then stop them. Keep both ports free, build after application
changes, and run suites sequentially; existing servers are not reused.
For focused runs and interactive development, see [test commands](docs/testing.md#running-the-tests).

## CI and reporting

The [Quality workflow](.github/workflows/quality.yml) runs on main pushes and pull
requests: clean install, typecheck, zero-warning lint, build, six standalone
regressions, Linux browser installation, and one `npm test` invocation. API,
resilience, and accessibility checks share that gate. It uses two CI workers
(four locally), full parallelism, and zero retries.

Console and HTML reports include namespace-cleanup and axe attachments. Failures
retain traces and browser screenshots. CI uploads `playwright-report/` and
`test-results/` as `playwright-evidence` for seven days when the job is not cancelled.
Run `npm run report` to open the latest local HTML report.

[Hosted and local verification evidence](docs/verification.md) distinguishes
successful runs from historical failures and records their scope.

## Detailed documentation

- [Architecture, source paths, namespace lifecycle, and tradeoffs](docs/architecture.md)
- [Test scenarios, coverage counts, synchronization, and commands](docs/testing.md)
- [Accessibility audit, automated rule scope, and manual checklist](docs/accessibility.md)
- [Dated verification evidence and historical checkpoints](docs/verification.md)

## Honest limitations

Stores are in memory and reset on API restart. Authentication, durable databases,
pagination, payments, and deployment are outside this fixture. Namespace IDs provide
test isolation, not a security boundary; test-support routes are enabled only in test mode.
Abrupt termination can skip teardown, and independent suite invocations share fixed ports.

Network interception does not prove server failure generation, automatic retries,
offline behavior, or write-conflict handling. Selected automated accessibility
checks require complementary manual assistive-technology, zoom/reflow, and
forced-colors assessment. Visual regression, other error routes, Unicode search
semantics, and competing writes remain outside coverage.
