# Evaluating an Evidence-Grounded AI Failure Analyst

*A controlled QA engineering case study using Playwright evidence, structured LLM analysis, offline scoring, and human adjudication*

> **Study scope:** Eight deliberately constructed synthetic cases. This is an experimental quality-evaluation study, not a production validation or a claim of general-purpose AI root-cause accuracy. The underlying benchmark, gold annotations, captured responses, and full adjudication record remain outside the public repository.

## The engineering question

Can an AI assistant classify a test failure and explain what the supplied evidence does—and does not—establish, without turning an observed symptom into an unsupported root-cause claim?

Conventional automated tests tell us whether an assertion passed. Investigating a failure adds another layer: separating application defects, test-expectation problems, test-data setup, environment startup, integration failures, and cleanup issues. An AI assistant may produce a plausible narrative even when the evidence is incomplete. This study evaluates both classification and the reliability of the narrative.

This experiment is separate from the repository's [controlled agentic defect-detection pilot](../agentic-qa-defect-detection.md). That pilot asks whether an AI-generated test detects an injected regression. This case study asks how accurately a model interprets supplied failure evidence.

## System and evaluation workflow

The local experimental workflow was:

1. **Collect and normalize evidence.** Construct a bounded, sanitized analyst-visible packet describing the requirement, assertion, test result, and available diagnostics. Record when particular evidence is absent or not collected.
2. **Analyze with a structured model response.** Send the packet to GPT-5.4 using the OpenAI Responses API with no model tool access. Request an explicit outcome, failure classification, requirement assessment, test-integrity assessment, supporting citations, and uncertainty statements.
3. **Validate and preserve.** Check the returned object against a defined response contract, and preserve the selected response and associated provenance before scoring.
4. **Score offline.** Compare selected structured fields against previously frozen, operator-controlled labels without a further model call. Assess semantic evidence grounding separately from exact-label scoring.
5. **Conduct human adjudication.** Review disputed claims against the analyst-visible packets, approve or reject concerns, and record methodological clarifications without rewriting the original results.

The evidence boundary is intentional: information available to a benchmark custodian or human reviewer is not automatically available to the model. The model should only claim support from the packet it received.

## Controlled dataset and results

Eight synthetic cases were designed to exercise distinguishable conditions: application logic, test expectation, test data, environment startup, integration/API failure, fixture cleanup, insufficient evidence, and a passing/no-failure scenario. These were intentionally selected test cases, not a random sample of production incidents.

One successful model response was selected for each case. The table reports the frozen original objective evaluation; it does not incorporate any retrospective corrections from human review.

| Evaluation dimension | Correct / evaluated | Result |
| --- | ---: | ---: |
| Structured response contract | 8 / 8 | 100% |
| Outcome category | 8 / 8 | 100% |
| Strict failure classification | 8 / 8 | 100% |
| Accepted failure classification | 8 / 8 | 100% |
| Abstention behavior | 8 / 8 | 100% |
| Requirement-status assessments | 6 / 9 | 66.7% |
| Test-integrity assessments | 4 / 8 | 50% |

**Interpretation:** The model followed the output contract and matched the intended broad classes for these eight designed examples. This does **not** establish high accuracy on new incidents. The weaker requirement and test-integrity results reveal that selecting the right category does not guarantee a sound conclusion about whether a requirement was violated or whether an assertion was aligned with it.

One case included more than one labeled requirement assessment, hence nine requirement-status evaluations for eight cases. There is no defensible single composite score for all dimensions.

## What the failure analysis uncovered

The offline objective scorer identified label mismatches. A separate AI-prepared grounding review was then examined and adjudicated by the human operator. All 12 provisional concerns were accepted, but **12 accepted concerns do not mean 12 hallucinations or 12 wrong primary diagnoses**. Several concerned a citation, uncertainty wording, or an ambiguous evaluation rule.

### 1. A failed request is not always a violated requirement

One model analysis labeled a conditional requirement `violated` after an API request failed. The available evidence did not establish that the requirement's service-availability precondition held. A failure symptom can be real while a specific requirement-violation conclusion remains unsupported.

**Lesson:** Verify applicability conditions before selecting `violated`; otherwise use `unknown` when the evidence cannot decide.

### 2. One requirement needs one overall verdict

A multi-clause scenario included a successful main assertion and a failed mandatory cleanup. The analyst assigned both `met` and `violated` to the same requirement identifier. Those clause-level observations were individually meaningful, but the combined requirement needed one consistent overall assessment.

**Lesson:** Keep clause-level observations distinct from the status of the complete requirement.

### 3. Assertion alignment is different from change history

In one case, the supplied assertion visibly conflicted with the requirement. The model described that discrepancy but selected `unknown` for integrity because historical edits had not been independently verified. These are different questions.

**Lesson:** Assess observable assertion-to-requirement alignment separately from whether an AI changed assertions during the analysis and whether earlier changes were historically verified.

### 4. A passing test is evidence, but not raw-behavior proof

In a passing scenario, aligned assertions and successful cleanup supported **recorded compliance**. The absence of raw result-row output meant that **independent corroboration** remained unavailable. Treating these two evidence standards as interchangeable led to disagreement with the benchmark's stated interpretation.

**Lesson:** Document whether `met` means compliance evidenced by an aligned passing test or independently verified application output.

### 5. Correct statements can still have weak citations

Some comments about missing HTTP traces were consistent with packet-level metadata but cited evidence entries about unrelated statistics or configuration. The issue was citation precision, not necessarily fabrication of an event.

**Lesson:** Verify that each cited evidence item semantically supports the precise claim, not merely that the ID exists in the packet.

### 6. Confidence in a symptom is not confidence in its cause

Connection refusals and timeouts can strongly establish an observed startup failure without identifying whether the underlying issue is process launch, endpoint configuration, or timing. Similarly, an API 200 followed by a 503 does not establish separate backend architectures.

**Lesson:** Separate observed failure mode, candidate mechanism, source confirmation, and confidence scope. Model-supplied numeric confidence in this study was **not statistically calibrated**.

### 7. Synthetic incidents do not imply retained production logs

Some recommended follow-up investigations were technically sensible for real failures but referred to logs “from the same run” when the incident was synthetic and no corresponding live execution was established.

**Lesson:** Recommend inspecting retained artifacts only if they exist; otherwise propose a newly authorized reproduction that captures the necessary diagnostics.

## Human review and rubric clarifications

The human operator reviewed 12 provisional concerns and explicitly accepted all 12, distinguishing substantive errors from lower-severity wording and grounding issues. The full decision record and private benchmark data are retained locally and are not part of this public case study.

Two interpretive clarifications were approved:

- **Test integrity:** `preserved`, `concern`, and `unknown` describe observable alignment between supplied assertions and requirements. They do not prove unchanged test-code history.
- **Requirement status:** `met`, `violated`, and `unknown` require evidence of applicability and compliance. Combined requirements receive one overall status; reported compliance is separated from independent raw-output corroboration.

These clarifications explain the original evaluation. They were **not** used to alter frozen gold labels, captured model outputs, or original scores.

## Reproducibility, boundaries, and limitations

- This is an eight-case **synthetic, non-blind** experiment. Its case distribution was designed rather than sampled from operational incidents.
- Exact-label agreement does not establish semantic correctness of all reasoning, source-level root-cause confirmation, or external validity.
- The reported percentages are descriptive fractions, not precise estimates of model reliability or statistically tested differences.
- The experiment did not independently calibrate confidence scores or validate diagnoses against production telemetry.
- The full private evidence packets, annotations, captured model outputs, custody artifacts, and human-review record are intentionally **not public**. Consequently, outside readers cannot independently reproduce the exact benchmark scores from this document alone.
- No claim is made that the model can autonomously repair tests, modify production systems, or safely adjudicate incidents without human oversight.

## What I would improve next

1. Introduce explicit, versioned fields for requirement applicability, clause-level observations, and the single overall requirement verdict.
2. Separate assertion alignment, AI-authored assertion changes, and historically verified unchanged assertions.
3. Give HTTP evidence-availability metadata first-class citation references and validate citation-to-claim support.
4. Distinguish observed symptoms from mechanisms and require explicit `unconfirmed` language where underlying causes are not established.
5. Provide evidence-threshold rules for reported compliance versus independent corroboration.
6. Build a genuinely independent, larger evaluation set with documented review procedures before making reliability claims.

## Takeaway

In this controlled study, **broad failure classification was easier than defensible requirement reasoning**. The model could select all eight intended classes while still producing unsupported conditional-requirement judgments, inconsistent combined-requirement assessments, and ambiguous integrity labels. The engineering contribution is not a headline accuracy figure; it is an evaluation workflow that preserves evidence boundaries, makes disagreements inspectable, requires human adjudication, and leaves historical results intact.
