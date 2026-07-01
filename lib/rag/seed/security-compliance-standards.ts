import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[4];

export const securityComplianceStandardsSeed = [
  {
    id: "security_compliance_standards-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Security and Compliance Standards",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["security", "compliance", "audit", "incident-response", "controls"],
    content: `Enterprise Security and Compliance Standards

Baseline security obligations:
Vendors handling confidential information, customer data, personal data, production access, or critical services must maintain documented administrative, technical, and physical safeguards. Expected controls include encryption in transit and at rest where appropriate, access control, least privilege, MFA for privileged access, logging and monitoring, vulnerability management, secure development practices, malware protection, backup and recovery, personnel screening where relevant, and periodic control review.

Incident response:
Contracts should require prompt notice of actual or reasonably suspected unauthorized access, disclosure, loss, alteration, or unavailability affecting protected data or services. Notice should include known facts, affected systems or data, containment actions, remediation steps, customer support obligations, and continuing updates. Vague notice without timing, cooperation, or remediation duties is not sufficient for material data or service exposure.

Audit and evidence:
Where audit rights are needed, prefer evidence-based review through SOC 2, ISO 27001, penetration test summaries, security questionnaires, policy summaries, or regulator-required evidence. On-site audit should be limited by confidentiality, notice, scope, frequency, and operational disruption controls. Vendors should remediate material findings within agreed timeframes.

Compliance:
The contract should allocate responsibility for applicable laws, sanctions, anti-bribery, export controls, privacy, sector rules, and customer compliance obligations. Compliance language should require flow-down to subcontractors and notice of material control failures where the vendor controls the relevant environment.

High-risk security gaps:
Escalate missing incident notice, unrestricted subcontracting, no control baseline, no audit evidence, no encryption commitment for sensitive data, no deletion/return obligation, no business continuity standard for critical services, or a security obligation limited only to the vendor's changing internal policies.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.security_compliance_standards,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "standard",
        domains: ["Compliance", "Technical", "Operational", "Legal"],
        contractTypes: ["SaaS", "Vendor", "DPA", "MSA"],
        governanceArea: "security_compliance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["security controls", "incident response", "audit evidence", "compliance"]
      }
    }
  }
] satisfies KBSeedDocument[];
