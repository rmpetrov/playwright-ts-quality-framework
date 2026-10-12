# playwright-ts-quality-framework

A Senior SDET portfolio showcase in TypeScript and Playwright: real HTTP contracts,
parallel-safe fixtures, cross-browser workflows, deterministic network failure
injection, keyboard interactions, and an enforced accessibility quality gate.
The small Order Management Console is a local test fixture, not a production app
or a claim of professional project experience.

## Run locally

Use Node **22.22.0** (`nvm use`, if available) and npm. Runtime needs no credentials
or external services; initial dependency/browser downloads need network access.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run typecheck
npm run lint
npm run build
npm run test:regression
npm test
```

On Linux, install browser dependencies with
`npx playwright install --with-deps chromium firefox webkit`.
Tests start built Fastify and Vite preview servers on `127.0.0.1:3001` and
`127.0.0.1:5173`, then stop them. Build after application changes, keep both ports
free, and run test commands sequentially. Existing servers are not reused.
For interactive development, run `npm run dev` and open
[the local console](http://127.0.0.1:5173); restart the API to reset its default store.

| Command | Purpose |
| --- | --- |
| `npm run typecheck` / `npm run lint` / `npm run build` | Strict types, zero-warning lint, compiled apps |
| `npm run test:regression` | Six standalone configuration/client regressions |
| `npm run test:api` | 23 real HTTP API scenarios |
| `npm run test:ui` | 23 scenarios in each of Chromium, Firefox, and WebKit |
| `npm run test:a11y` | Nine accessibility/keyboard scenarios in all three browsers |
| `npm run test:isolation` | Focused namespace-isolation check |
| `npm test` | All 92 Playwright executions: 23 API and 69 UI |
| `npm run report` | Open the latest HTML report |

## Engineering coverage

- **Independent API expectations:** all four allowed and twelve rejected status
  transitions, persisted state, query combinations, invalid inputs, and boundaries.
- **Owned test data:** typed fixtures create fresh UUID namespaces, send the same
  header through browser/Vite and direct API contexts, and verify DELETE 204 then
  scoped GET 404 during teardown. Cleanup evidence is attached even after failures.
- **Browser resilience:** twelve scenarios cover listing/update HTTP errors, invalid
  responses, network aborts, controlled loading, recovery, and obsolete requests.
  Failed mocked PATCH requests never reach the store; real reads verify state.
- **Accessibility:** full-page axe scans cover loaded, filtered, empty, loading,
  successful update/terminal, listing-error, and update-error states. Assertions
  establish the intended UI state before every scan; no rules or elements are excluded.
- **Keyboard:** search/filter, pending → processing and processing → shipped updates,
  real API persistence, forward/reverse focus, visible outlines, skipped disabled
  buttons, terminal rows, focus restoration after refetch, and preservation of
  intentionally moved focus during an update. Native select
  type-ahead commits on blur; macOS WebKit uses Option+Tab to reach buttons.

## Accessibility scope

`@axe-core/playwright` **4.13.0** uses locked axe-core **4.13.0** with tags `wcag2a`,
`wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa`. The installed WCAG 2.2 AA rule is
`target-size`; these tags select supported automated rules, not every WCAG criterion.
Small computed-style checks also protect this fixture's solid-color control
boundaries (3:1) and visible focus outlines. Status/alert roles expose meaningful
loading, empty, success, and error messages. Scan attachments contain compact
violations and incomplete checks, with rule IDs, impact, targets, and explanations.

```sh
npm run build
npm run test:a11y
npm run test:a11y -- --workers=4 --retries=0 --repeat-each=3
```

Automated scans and live-region semantics do **not** prove complete WCAG compliance,
certification, or screen-reader announcement behavior. Manual checks should cover
VoiceOver/Safari and NVDA/Firefox or Chromium, announcement timing, table navigation,
zoom/reflow, text spacing, forced colors, native menus, and focus visibility at
narrow viewports. See the [audit and manual checklist](docs/accessibility.md).

## Architecture and CI

One npm package and lockfile contain Fastify (`apps/api`), React/Vite (`apps/web`),
typed fixtures/page object (`tests/fixtures`, `tests/pages`), independent data,
API/UI specifications, and Node regressions. The UI stays deliberately small:
search, status filtering, a semantic order table, and native status-update controls.
Search matches ID/customer case-insensitively and combines with status; the backend
allows pending → processing/cancelled and processing → shipped/cancelled.
Shipped/cancelled orders are terminal.

Test-support routes require both `NODE_ENV=test` and `ENABLE_TEST_SUPPORT=true`;
normal startup exposes none. Namespace IDs isolate tests and are not authentication.
Read [architecture and tradeoffs](docs/architecture.md) for contracts and ownership.

The GitHub Actions quality job runs `npm ci`, type checking, lint, build, standalone
regressions, matching browser installation, and **one `npm test` invocation**.
The existing UI project patterns discover accessibility tests automatically;
any selected axe violation or keyboard assertion failure fails that same gate.
Parallel execution uses four local/two CI workers with **zero retries**. HTML reports,
namespace cleanup, failure traces, and screenshots are uploaded by CI.
Dated execution evidence and local/hosted-CI distinctions live in
[verification](docs/verification.md).

## Boundaries

Data is in memory; restart clears it. No authentication, database, pagination,
payments, or deployment is included. Abrupt termination can skip teardown, and
only one test invocation can occupy the fixed ports. Other error routes, Unicode
search semantics, and competing writes remain outside coverage. Network interception
proves frontend handling, not backend error generation, offline operation, or
automatic retries. Visual regression and unrelated framework extensions are deferred.
