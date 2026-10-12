# Accessibility audit and test scope

## Initial findings

The Phase 2C audit inspected App, OrderRow, styles, existing UI/resilience tests,
fixtures, page object, runner, package, and quality workflow before changing the app.

| Area | Observed behavior before fixes |
| --- | --- |
| Document/structure | English document language, descriptive title, one main landmark and one h1; no heading levels were skipped. |
| Names/forms | Search and filter use wrapping labels. Native row selects/buttons have order-specific accessible names. |
| Table | Named native table, six scoped column headers and order IDs as scoped row headers. |
| Feedback | Loading/empty/success use status; listing/PATCH failures use alert. PATCH errors retain usable rows without false success. |
| Status/disabled controls | Visible status text accompanies badge colors. Terminal rows show Final status and no actions; unselected updates are disabled and skipped. |
| Focus | A 3px solid outline with 3px offset contrasts 3.40:1 against the page and 3.66:1 against white. Ordinary forward/reverse keyboard traversal worked. Successful refetch lost the submitting control's focus. |
| Contrast | Text scans found no selected axe violations. Input/select borders measured 1.65:1 against the page and 1.78:1 against white, making control boundaries difficult to distinguish. |
| Updates | AbortController rejects obsolete listing results. Accessible names and roles remain available in the tested dynamic states; actual assistive-technology announcements were not audited. |

Initial full-page scans of loaded, held loading, listing error, and PATCH error
states found **no selected axe violations** in Chromium, Firefox, or WebKit.
This did not detect the two additional focused-audit findings below.

## Minimal fixes and regressions

1. **Focus lost after a successful update.** The button becomes disabled and the
   refetch may unmount the table. Keyboard users lose their current order position.
   The retained regression failed after a successful real pending → processing
   update and independent API read in Chromium and Firefox. App now records an
   update initiated from the focused button and restores focus after
   the listing settles: the same order's native selector when available, otherwise
   Search orders. Restoration tracks the submitting element and fresh orders; a
   fast refetch can retain a disabled button instead of moving focus to body.
   Focusing another control cancels restoration from the start of PATCH.
   OrderRow adds only a stable native select ID. Both nonterminal and terminal
   keyboard workflows protect restoration and verify real persistence.
2. **Weak control boundaries.** A computed-style regression failed in all three
   browsers at an unrounded 1.6525:1 against the page. Changing the existing border
   token from `#b5c5ca` to `#738a96` yields 3.36:1 against the page and 3.62:1 against
   white. This improves visibility without changing layout or native controls.
   The loaded-state test protects input/select boundaries. The 3:1 boundary target
   is the project's explicit visual guard, informed by
   [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html);
   a visible boundary is not required for every kind of control. Disabled controls
   are outside this contrast assertion. No axe rule or scan region is suppressed.

Backend rules, seed data, existing assertions, fixture lifecycle, retries, and
runner settings remain unchanged. No component library or application feature was added.

## Nine scenarios

| Scenario | Stable state / evidence |
| --- | --- |
| Loaded page | Exact six row IDs; labelled controls, main/h1, scoped table headers; boundary contrast and full-page scan. |
| Keyboard search/filter/empty | Tab to search, type Mia, Tab to filter and native p type-ahead, Shift+Tab to commit; only pending ORD-1006 remains. Replace search by keyboard; exact visible empty status and absent table. Scan both results and empty state. |
| Keyboard pending → processing | Semantic focus checkpoints, native type-ahead/blur, enabled Update and Enter; exact success, refreshed processing row, no loading/error, independent full-order API read, restored selector focus and scan. |
| Keyboard processing → shipped | Real API setup, same keyboard workflow; persisted terminal status, no actions, restored search focus and scan. |
| Intentional focus move during PATCH | A promise holds the real PATCH; Shift+Tab moves to the filter while actions are disabled. Release, wait for the refreshed processing row and independent API persistence, then verify the filter retains visible focus. |
| Forward/reverse focus | Each enabled native control in order; visible outline geometry and contrast; disabled buttons skipped/nonactivatable, terminal rows without controls, return to search without a trap. |
| Held loading | Exact visible loading status and absent table while a test-local promise holds GET; scan, release, and wait for six real rows. Gate releases in finally. |
| Listing error | One deterministic GET 500; exact visible alert, no stale loading/table, named usable filters and scan. |
| Failed PATCH | One non-forwarded 503; exact visible alert, no success, pending row and re-enabled controls, then scan. Phase 2B retains the broader recovery/persistence matrix. |

Keyboard workflows use key events and semantic focus assertions, with no mouse
clicks or selectOption calls. For WebKit, native select type-ahead is explicitly
committed by moving focus to the preceding stable filter/search control. On macOS,
Option+Tab includes buttons in native WebKit traversal; other platforms use Tab.
Each navigation step names its expected control instead of relying on blind counts.

## Axe scope and CI gate

Exact direct dependency `@axe-core/playwright@4.13.0` resolves axe-core 4.13.0.
The package declares compatibility with playwright-core >=1.0.0; the installed
Playwright remains 1.64.0. The installed engine's rule metadata confirms these tags:
`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. The last currently selects
`target-size` (WCAG 2.2 AA). There is no `wcag22a` tag in this engine. AAA,
experimental, and best-practice-only rules are outside the chosen gate.

A small helper configures a fresh full-page AxeBuilder for each stable state.
Every reported violation, regardless of impact, fails a normal Playwright assertion.
Compact attachments contain engine version, tags, rule ID, impact, targets, a
short description/failure summary, help link, and incomplete checks for review.
Incomplete results require human assessment; they are not recorded as proven passes.
No rule disablement, element exclusion, huge result snapshot, separate runner,
retry, timeout increase, or skip was introduced.

The existing quality workflow's single npm test command discovers the spec in all
three UI projects, alongside API and resilience coverage. Focused local execution
is `npm run build` followed by `npm run test:a11y`. Reports retain namespace cleanup
and failure artifacts. See [verification](verification.md) for actual gate-failure,
repeat-run, cross-browser, and cleanup evidence.

## Manual assessment still required

Automated rules catch only a subset of accessibility issues, as described in
[Playwright's accessibility guidance](https://playwright.dev/docs/accessibility-testing).
Correct ARIA roles/text do not prove how every screen reader announces a newly
inserted live region. Full WCAG compliance, certification, and screen-reader
compatibility are not claimed.

Recommended manual checks:

- VoiceOver/Safari and NVDA/Firefox or Chromium: read labels, table headers and
  status text, operate native menus, and assess loading/success/error announcement
  timing, interruption, repeated messages, and changing result lists.
- Keyboard with actual browser/OS settings: inspect focus placement, visibility,
  scroll behavior, terminal/filtered updates, and navigation when requests are pending.
- Zoom to 200%/400%, narrow viewports, text spacing and reflow: verify readable
  content, reachable controls, and usable horizontally scrolling order tables.
- Forced colors/high contrast, magnification, native-menu rendering, touch targets,
  and inclusive user testing. Computed solid-color ratios do not establish every
  visual state, clipping/obscuration, gradient/image contrast, or assistive setting.

GitHub-hosted Linux and actual screen readers require separate execution; local
macOS browser projects alone do not verify those environments.
