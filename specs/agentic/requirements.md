# REQ-001 — Order Search and Filtering

Status: supplied and approved by the human requester on October 20, 2026.

## Independent authority

These acceptance criteria are transcribed from the user's approved pilot scope.
They are not inferred from application source, observed responses, or existing tests.
Only a human-approved requirements change may alter the expected results below.

## Starting conditions

- Use the local Order Management Console with a fresh test-owned namespace.
- Use the repository's custom fixtures and existing OrdersPage.
- The pilot dataset must contain ORD-1001 and ORD-1002, both for Ava Chen and both pending.
- Exercise the real local application without mocking the search/filter response.

## Required action and result

1. Select the `pending` status filter.
2. Search for `aVA`.
3. Expect exactly two matching orders: `ORD-1001` and `ORD-1002`, with no additional rows.
4. Both matching orders must belong to `Ava Chen`.
5. Both matching orders must have status `pending`.

The requirement specifies membership, count, customer, and status. It does not
specify row order, so the eventual test must not invent an ordering requirement.

## Traceability and discrepancy handling

The future plan and generated test must reference REQ-001 and map each expected
result to an explicit assertion. Exact expected IDs, customer, count, and status
must come from this document. Do not import application rules or seed data, use
application functions to calculate expectations, or turn observed output into
the expected result. Report any discrepancy and stop; do not change the oracle.

## Stage boundaries

Stage A prepares infrastructure and verifies the exploration seed only. A human
must separately approve planning (Stage B), generation (Stage C), and execution
of the generated test (Stage D), followed by human review (Stage E). This document
does not authorize those later stages. The seed is not generated REQ-001 coverage.
