import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[6];

export const procurementPolicySeed = [
  {
    id: "procurement_governance_policy-enterprise-v1",
    collection: COLLECTION,
    title: "Procurement Governance Policy",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["procurement", "vendor-review", "approval-policy", "commercial-controls"],
    content: `Procurement Governance Policy

Vendor onboarding:
New vendors must be reviewed for business owner, finance, security, privacy, and legal requirements based on service criticality, spend, data exposure, system access, and regulatory impact. Vendors with access to confidential information, personal data, production systems, customer environments, or critical operations require enhanced diligence before signature.

Commercial controls:
Contracts should define fees, payment timing, invoice requirements, taxes, expenses, price increases, renewal pricing, overage charges, audit fees, and termination charges. Auto-renewals should provide advance notice and practical non-renewal rights. Multi-year commitments, prepaid fees, minimum commitments, and non-cancellable spend require finance approval.

Approval thresholds:
Business owner approval is required for scope, service levels, operational dependencies, transition plans, and acceptance criteria. Finance approval is required for material spend, unusual payment timing, non-standard price changes, or open-ended expenses. Security and privacy approval is required for regulated data, personal data, production access, integrations, or vendor-managed credentials. Legal approval is required for non-standard liability, indemnity, termination, confidentiality, IP, audit, assignment, or dispute terms.

Vendor performance:
Critical vendors should commit to service availability, support response, continuity planning, incident notice, subcontractor oversight, change notice, and transition assistance. The contract should allow practical remedies when performance failures affect customers, compliance, or business operations.

Procurement escalation:
Escalate sole-source restrictions, exclusivity, broad audit fees, hidden renewal uplift, unilateral service changes, termination penalties, weak transition support, vendor lock-in, unrestricted subcontracting, or terms that prevent the organization from meeting customer or regulatory obligations.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.procurement_policy,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "policy",
        domains: ["Financial", "Operational", "Compliance", "Legal", "Technical"],
        contractTypes: ["Vendor", "SaaS", "MSA", "DPA"],
        governanceArea: "procurement_governance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["procurement", "vendor onboarding", "approval threshold", "commercial control"]
      }
    }
  }
] satisfies KBSeedDocument[];
