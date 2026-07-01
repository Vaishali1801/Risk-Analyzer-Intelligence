import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[1];

export const riskTaxonomySeed = [
  {
    id: "risk_taxonomy-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Risk Taxonomy",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["risk-taxonomy", "severity", "classification", "escalation"],
    content: `Enterprise Risk Taxonomy

Risk categories:
Legal risk covers enforceability, liability, indemnity, dispute resolution, assignment, termination, IP ownership, confidentiality, governing law, regulatory allocation, and provisions that may conflict with internal contracting authority.

Financial risk covers payment timing, invoicing, taxes, price changes, audit fees, credits, penalties, setoff, payment holds, renewal economics, volume commitments, and exposure that cannot be forecast or capped.

Operational risk covers implementation dependencies, service delivery, acceptance, change control, staffing, subcontracting, transition assistance, business continuity, audit burden, and obligations that may be difficult to perform or evidence.

Compliance risk covers privacy, security, sector regulation, sanctions, anti-bribery, records retention, audit evidence, data transfer, incident notification, and controls needed to support customer or regulator expectations.

Technical risk covers system access, integration dependencies, data migration, availability, disaster recovery, vulnerability management, encryption, logging, identity and access management, AI/data reuse, and support commitments.

Severity guidance:
High severity applies when a term could create uncapped or material financial exposure, irreversible IP or data consequences, regulatory breach, customer-impacting service failure, security incident exposure, inability to terminate, inability to transition, or acceptance of obligations outside business authority.

Medium severity applies when a term creates meaningful but manageable exposure, requires negotiation to clarify scope, weakens evidence or enforcement, shifts operational burden, limits remedies, or leaves important controls dependent on policy discretion.

Low severity applies when a term is incomplete, ambiguous, or commercially unfavorable but unlikely to materially impair performance, compliance, payment, data protection, or exit rights if clarified before signature.

Escalation guidance:
Escalate high severity findings, repeated medium findings in the same control area, any missing data processing terms for personal data, any broad AI/data training permission, any liability position that conflicts with approved caps, and any vendor right to suspend, change, assign, or subcontract critical services without adequate notice or remedy.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.risk_taxonomy,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "risk_taxonomy",
        domains: ["Legal", "Financial", "Operational", "Compliance", "Technical"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "risk_classification",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["severity", "classification", "escalation", "risk category"]
      }
    }
  }
] satisfies KBSeedDocument[];
