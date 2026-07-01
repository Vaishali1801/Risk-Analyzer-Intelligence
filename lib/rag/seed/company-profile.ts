import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[0];

export const companyProfileSeed = [
  {
    id: "company_profile-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Company Profile",
    sourceType: "manual_seed",
    version: "1.0.0",
    tags: ["company-context", "risk-appetite", "approval-thresholds", "contracting-position"],
    content: `Enterprise Company Profile

The organization uses contract review to protect revenue continuity, customer trust, regulated data, operational resilience, and audit readiness. Reviewers should prefer clear allocation of responsibility, measurable performance commitments, enforceable confidentiality, security and privacy obligations, and practical remedies that can be administered by business owners without creating hidden operational burdens.

Risk appetite is moderate for routine low-value vendor and service contracts where obligations are operationally simple, data exposure is limited, and termination rights remain practical. Risk appetite is low for contracts involving regulated data, production system access, customer-facing service commitments, uncapped liability, broad indemnities, non-standard payment holds, irreversible IP assignments, or vendor lock-in.

Preferred contracting posture:
* obligations should be mutual where both parties control performance or information;
* vendor obligations should be specific enough to audit and enforce;
* customer obligations should not excuse vendor failure unless dependency is objective and documented;
* confidentiality, data protection, security, audit, incident notice, subcontracting, assignment, and termination provisions should survive where needed;
* changes to scope, price, security commitments, service levels, data processing, or subprocessors should require written approval or documented notice rights;
* acceptance, renewal, termination, and payment mechanics should avoid indefinite delay or unilateral discretion.

Approval expectations:
* high-risk terms require legal or executive review before signature;
* business owner approval is required for operational exceptions, service-level exclusions, transition obligations, and implementation dependencies;
* finance approval is required for non-standard payment timing, prepaid commitments, auto-renewals above budget threshold, audit fees, credits, penalties, or open-ended pass-through costs;
* security or privacy approval is required for personal data, confidential customer data, production access, AI/data reuse, cross-border transfer, weak incident notice, or missing control commitments.

Escalate when a contract includes uncapped or unusually broad liability, one-way indemnity, unrestricted data use, weak confidentiality survival, no meaningful termination right, assignment without consent, audit rights that expose sensitive operations, security obligations limited to policy discretion, service credits as exclusive remedy for material outages, or customer payment hold rights without objective dispute rules.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.company_profile,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "company_profile",
        domains: ["Legal", "Financial", "Operational", "Compliance", "Technical"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "enterprise_contracting_posture",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["risk appetite", "approval threshold", "preferred position", "escalation"]
      }
    }
  }
] satisfies KBSeedDocument[];
