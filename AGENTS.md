# Agentic QA pilot instructions

Follow the human's currently authorized stage. Stage A prepares infrastructure
and may execute the corrected seed for verification; it does not authorize any
Planner, Generator, or Healer invocation. See docs/agentic-qa.md for the workflow.

## Human approval gates

- Stage B: planning and seed-backed browser exploration only, after explicit human approval.
- Stage C: generate one test only after the human approves the Stage B plan.
- Stage D: execute the generated test only after separate human approval.
- Stage E: human review of requirements, assertions, diffs, and execution evidence.
- Approval for one stage never authorizes the next. Failures stop for diagnosis
  and human review; never start healing automatically.

## Required boundaries

- Do not modify application source, existing tests, fixtures, page objects, test-owned
  data, dependencies, GitHub Actions, or the original playwright.config.ts.
- Do not weaken or remove assertions, broaden approved expected values, swallow
  failures, increase retries to hide failures, or add conditional bypasses.
- Do not introduce skip, fixme, expected-failure annotations, or focused-only tests.
- Business expectations come only from specs/agentic/requirements.md. Never copy
  them from application logic, application seed data, or observed responses.
- Use the custom test/expect exports and OrdersPage. Every test owns its namespace;
  preserve the fixture's checked cleanup and use real local HTTP for REQ-001.
- Stage B may create only specs/agentic/REQ-001.plan.md. Stage C may create only
  tests/agentic/order-search-and-filtering.spec.ts. Infrastructure, requirements,
  seed, and agent-policy changes require additional human approval.
- Invoke only the named agent for the explicitly approved stage. Do not invoke,
  restore, or load the quarantined Healer. Do not rerun init-agents, which would
  recreate its unsafe definition and overwrite the pilot's agent instructions.
- Report out-of-scope changes or requirement discrepancies and stop. Do not commit
  or push without explicit authorization.

These instructions are policy, not an operating-system write boundary. Do not
claim that agent prompts, read-only tool annotations, or TOML agent settings
enforce path restrictions. Shell and MCP writes need independent enforcement.
