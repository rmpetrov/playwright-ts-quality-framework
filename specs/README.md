# Agentic QA specifications

- [REQ-001 requirements](agentic/requirements.md): the independent, human-approved
  authority for expected count, order membership, customer, and status.
- [Approved REQ-001 test plan](agentic/REQ-001.plan.md): one Planner scenario with
  explicit requirements-to-assertions traceability.
- [Generated REQ-001 test](../tests/agentic/order-search-and-filtering.spec.ts): one
  test using the existing custom fixtures and OrdersPage.
- [Completed pilot and verified execution evidence](../docs/agentic-qa.md).

Observed application behavior and implementation code must not redefine these
requirements. Future planning, generation, and execution each require separate
human approval under [AGENTS.md](../AGENTS.md).
