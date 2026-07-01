import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[2];

export const contractReviewPlaybookSeed = [
  {
    id: "contract_review_playbook-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Contract Review Playbook",
    sourceType: "approved_playbook",
    version: "1.0.0",
    tags: ["review-playbook", "negotiation", "fallback-position", "escalation"],
    content: `Enterprise Contract Review Playbook

Review strategy:
Start with the business purpose, contract type, data exposure, payment model, service criticality, and whether the organization is acting as customer, supplier, processor, controller, discloser, or recipient. Prioritize terms that affect enforceability, financial exposure, security posture, privacy obligations, continuity, and exit rights.

Negotiation posture:
Use balanced language where both parties control the obligation. Use protective language where the counterparty controls security, privacy, subcontracting, service performance, confidential information, or transition support. Avoid positions that are operationally perfect but commercially unrealistic; prefer measurable commitments, notice rights, cure periods, documentation duties, and targeted remedies.

Fallback positions:
If the counterparty rejects a preferred clause, require at least objective standards, a documented exception, capped discretion, notice before adverse action, and an escalation path. For liability, preserve uncapped exposure for confidentiality breach, data protection breach, IP infringement, fraud, willful misconduct, payment obligations, and equitable relief where commercially appropriate. For security and privacy, require current controls, incident notice, audit evidence, and subcontractor flow-downs even when detailed schedules are deferred.

Review sequence:
1. Identify parties, role, contract type, scope, term, renewal, and termination mechanics.
2. Review payment, acceptance, change control, taxes, price changes, and audit fees.
3. Review confidentiality, IP, data rights, AI/data reuse, privacy, and security.
4. Review warranties, service levels, support, business continuity, disaster recovery, and incident response.
5. Review liability, indemnity, insurance, dispute resolution, assignment, subcontracting, and compliance.
6. Confirm final review decision, required approvals, and open gaps before signature.

Escalate when a fallback would leave material ambiguity, the business owner cannot operate the obligation, the counterparty retains unilateral discretion over a critical dependency, or the contract creates a mismatch between risk owner and control owner.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_playbook,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "playbook",
        domains: ["Legal", "Financial", "Operational", "Compliance"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "review_workflow",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["negotiation", "fallback", "escalation", "review sequence"]
      }
    }
  }
] satisfies KBSeedDocument[];
