import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[3];

export const contractReviewChecklistSeed = [
  {
    id: "contract_review_checklist-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Contract Review Checklist",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["review-checklist", "standards", "completeness", "required-controls"],
    content: `Enterprise Contract Review Checklist

Core checks for every review:
* parties, affiliates, ordering entities, and authorized signatories are clear;
* scope, deliverables, exclusions, dependencies, and acceptance criteria are objective;
* fees, taxes, expenses, payment timing, disputed amounts, and price changes are defined;
* term, renewal, suspension, termination for cause, termination for convenience, and transition support are workable;
* confidentiality covers business, technical, customer, security, and pricing information with appropriate survival;
* IP ownership, license scope, feedback, work product, residual knowledge, and third-party materials are addressed;
* warranties, disclaimers, indemnities, liability caps, exclusions, and insurance align with deal risk;
* data protection, security, audit evidence, incident response, and subcontractor controls are present where needed;
* governing law, venue, dispute process, notices, assignment, change control, and order of precedence are complete.

High-priority gap checks:
Missing or weak clauses should be raised when the contract involves personal data, confidential information, production access, customer-facing service commitments, regulated activity, payment holds, milestone acceptance, subcontractors, cross-border transfers, or customer data reuse.

Completeness standards:
Do not treat a vague policy reference as a complete clause when the contract needs measurable obligations. Do not treat a broad commercial warranty as a substitute for security, privacy, support, transition, or compliance duties. Do not treat service credits as adequate if outages can create regulatory, customer, or business continuity impact.

Final review checks:
Confirm that every high severity finding has a proposed action, every material gap has recommended language or an approval path, every accepted risk has a rationale, and unresolved items are visible to the final decision owner.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_checklist,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "checklist",
        domains: ["Legal", "Financial", "Operational", "Compliance", "Technical"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "review_completeness",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["checklist", "completeness", "missing clause", "final review"]
      }
    }
  }
] satisfies KBSeedDocument[];
