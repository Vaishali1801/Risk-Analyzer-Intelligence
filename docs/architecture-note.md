# Controlled Hybrid RAG Contract Risk Analysis Pipeline

## 1. Purpose

This app is an AI-assisted contract review workflow. It is not a chatbot and it is not an autonomous legal agent.

The intended pipeline analyzes uploaded contracts, identifies risks and missing protections, generates business and legal explanations, recommends clause language, and renders normalized results in the frontend and PDF report.

AI may suggest risks, gaps, explanations, business impact, and recommended clauses. The app must validate, normalize, rank, ground, and convert those suggestions into review-ready data. Human users accept, revise, or reject findings. Final review state is derived from user review activity, and final decision support is derived by the system rather than directly decided by the LLM.

Top risk drivers are selected deterministically from the normalized risk register. They are not directly chosen by the LLM.

## 2. End-to-End Pipeline

The intended end-to-end flow is:

Upload Contract
-> Input Guardrails
-> Parse & Clean Document
-> Deterministic Clause Segmentation
-> Clause Intelligence Layer
-> Session Contract Evidence Index
-> Persistent Reference Knowledge Index
-> Controlled Orchestrator
-> Targeted Hybrid RAG Retrieval
-> Reusable Risk & Gap Analysis Engine
-> Raw Domain Findings
-> Aggregator + Deduplication
-> Normalization + Guardrails
-> Runtime Quality Gate
-> Conditional LLM Judge / Repair
-> Normalized Contract Analysis Model
-> Frontend + PDF + Human Review Workflow

## 3. What Is Deterministic

The following parts should be deterministic or mostly deterministic:

- File type validation
- File size and page limit checks
- Parse and clean steps where possible
- Clause segmentation
- Stable clause ID generation
- Schema validation
- Severity and category normalization
- Confidence calibration
- Duplicate merging rules
- Risk and gap ranking
- Top risk driver selection
- Final review state derivation
- Final decision derivation
- PDF generation from normalized data

The app, not the LLM, should select top risk drivers from normalized risks using deterministic ranking rules such as:

- Severity priority: High > Medium > Low
- Confidence score
- Business impact availability and strength
- Source evidence availability
- Category or domain priority, if configured
- Review status, where applicable

## 4. What Uses LLM

The LLM should be used for:

- Clause type classification
- Domain detection
- Risk identification
- Risk reasoning
- Gap detection
- Why-it-matters explanation
- Business impact explanation
- Recommended clause drafting
- Executive summary drafting
- AI insight drafting
- Optional repair of failed or weak sections

Top risk driver selection must not be described or implemented as purely LLM-generated. The LLM may generate explanation text used inside risk findings, but the system should deterministically select which normalized risks become top risk drivers.

LLM output must always pass schema validation and normalization before reaching the UI or PDF layer.

## 5. What Uses RAG

RAG is used only for targeted evidence and reference retrieval, not for open-ended chat.

RAG should retrieve:

- Relevant contract clauses from the session evidence index
- Relevant reusable reference knowledge from the persistent vector database
- Clause library examples
- Risk taxonomy
- Compliance checklist
- Company playbook
- Best-practice templates

RAG enriches the evidence package passed into the reusable analysis engine. It should not change the frontend contract, PDF contract, review workflow, or normalized output schema.

## 6. Session-Scoped Data

Uploaded contract data is session-scoped.

Session data may include:

- Parsed contract text
- Clause JSON
- Clause IDs
- Clause metadata
- Optional temporary embeddings

Session data should not become permanent company knowledge. It should be deleted after the session or session expiry.

## 7. Persistent Data

Persistent knowledge includes:

- Company clause library
- Risk taxonomy
- Compliance checklist
- Company playbook
- Best-practice templates
- Approved reference guidance
- Embeddings and metadata stored in pgvector/Supabase in future phases

Persistent reference data is reusable guidance. It is separate from uploaded session contracts.

## 8. Controlled Orchestrator

The orchestrator should not behave like a free autonomous agent.

It should:

- Read the clause routing map
- Retrieve only relevant evidence
- Select domain profiles
- Batch clauses by category or domain where useful
- Run the reusable analysis engine with domain-specific profile instructions
- Manage parallel execution
- Pass raw findings into aggregation and validation

For the first implementation, this can remain a simple controller. It does not need to be over-engineered.

### Batching Strategy

Batching is required to control token usage, latency, and reliability when analyzing long contracts. The analysis pipeline should support batching of clauses before sending them into the reusable risk/gap analysis engine.

Initial batching behavior should:

- Split clauses into token-safe batches
- Preserve clause IDs in every batch
- Avoid splitting a single clause across batches
- Preserve nearby contextual clauses where useful
- Maintain section and page references
- Collect and merge findings after all batches complete

Future batching behavior may additionally support:

- Batching by clause type
- Batching by detected domain or category
- Batching by retrieval results
- Parallel execution of independent batches

Batching must not change the final output contract. All batch outputs must still pass through aggregation, deduplication, normalization, schema validation, and runtime quality checks before reaching the frontend or PDF layer.

## 9. Domain Profiles

The intended domain profiles are:

- Financial
- Legal
- Compliance
- Operational
- Technical/Data

Each profile should include:

- Domain-specific risk taxonomy
- Domain-specific gap checklist
- Severity rules
- Confidence rules
- Recommendation style
- Required output schema
- Retrieved contract evidence
- Retrieved reference guidance

## 10. Expected AI Findings

Each risk finding should include:

- Risk title
- Category/domain
- Severity
- Confidence
- Clause extract
- Flagged clause or problematic phrase
- Why it matters
- Business impact
- Recommended clause
- Source clause IDs

Each gap finding should include:

- Gap title
- Missing or weak protection
- Category/domain
- Priority: Must Add / Negotiate / Optional
- Confidence
- Why it matters
- Suggested fix
- Recommended clause
- Source clause IDs, where applicable

## 11. Aggregation and Deduplication

Raw domain findings are not final.

They must be:

- Merged
- Deduplicated
- Ranked
- Assigned primary categories
- Assigned secondary categories where applicable
- Selected into the final risk register
- Selected into the final gap register

The final top risk drivers should be derived from the normalized final risk register, not directly from raw LLM output.

## 12. Normalization + Guardrails

Normalization and guardrails should:

- Normalize severity values
- Normalize categories and domains
- Calibrate confidence
- Validate source clause IDs
- Confirm evidence exists
- Check that high risks have clear justification
- Prevent unsupported hallucinated findings
- Validate schema before UI/PDF consumption

## 13. Runtime Quality Gate

The runtime quality gate checks:

- Valid JSON
- Required fields present
- Source evidence exists
- Confidence threshold
- High-risk justification present
- No unsupported hallucinated finding

Failed or weak sections may be passed to Conditional LLM Judge / Repair in later phases.

## 14. Normalized Contract Analysis Model

This is the only model the frontend and PDF should consume.

It should include:

- Decision Snapshot data
- Final risk register
- Final gap register
- Source-linked findings
- Review-state-ready objects
- Summary information
- Deterministic top risk drivers
- Deterministic final review support

## 15. Human Review Workflow

Users can accept, revise, or reject risks and gaps.

The final review should be derived from review state, not directly from the LLM. The LLM can assist with explanations and recommendations, but review outcomes come from normalized findings plus user decisions.

## 16. Why No Autonomous Agents

The app intentionally avoids autonomous agents because contract review requires predictable, auditable, source-grounded, schema-validated outputs.

The architecture uses controlled orchestration instead of free-form agent planning. The orchestrator follows known steps, constrained domain profiles, explicit schemas, and deterministic post-processing rules.

## 17. Implementation Phasing

Phasing does not mean rebuilding or repeating work. The architecture should be designed so later RAG components plug into the same stable pipeline.

Phase 1:

- Architecture note
- Final AI output schema
- Deterministic clause segmentation
- Single reusable risk/gap analysis engine
- Normalization and guardrails
- UI/PDF integration

Phase 2:

- Lightweight local reference knowledge files
- Risk taxonomy
- Gap checklist
- Clause playbook

Phase 3:

- Supabase/pgvector knowledge store
- Offline ingestion pipeline
- Targeted RAG retrieval

Phase 4:

- Advanced orchestration logic
- Domain profiles
- Batching and parallel execution

Phase 5:

- Conditional LLM judge/repair
- Advanced quality gates
- Observability/evals

The stable output contract should remain the same across phases. Later RAG components should enrich the evidence package passed into the same reusable analysis engine, not replace the core schema, UI, PDF, or review workflow.
