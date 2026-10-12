import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Call only after the specification has established its exact, stable UI state.
export async function expectAccessible(page: Page, testInfo: TestInfo, state: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const concise = (items: typeof results.violations) => items.map((item) => ({
    rule: item.id,
    impact: item.impact,
    description: item.help,
    help: item.helpUrl,
    nodes: item.nodes.map((node) => ({
      targets: node.target,
      failure: node.failureSummary?.replace(/\s+/g, ' ').trim()
    }))
  }));
  const violations = concise(results.violations);
  await testInfo.attach(`accessibility-${state}`, {
    body: JSON.stringify({
      state, engine: results.testEngine, tags: wcagTags,
      violations, incomplete: concise(results.incomplete)
    }, null, 2),
    contentType: 'application/json'
  });
  expect(violations, `Automated WCAG violations in ${state}`).toEqual([]);
}
