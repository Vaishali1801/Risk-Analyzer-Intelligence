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
    content: `Northstar Cloud Intelligence (NCI) – Contract Review Checklist & Standards

Purpose
This document defines baseline review expectations and contract standards used by Northstar Cloud Intelligence (NCI) during enterprise contract evaluation.
The checklist supports:
• agreement completeness validation
• clause sufficiency assessment
• gap identification
• governance consistency
• operational accountability
• recommendation generation
• AI-assisted contract analysis
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review & Negotiation Playbook
• Security & Compliance Standards
• Approved Clause Guidance

Checklist Interpretation
Generally Required
Contractual protections or governance controls that should normally exist unless justified by the agreement scope, business context, or compensating contractual protections.

Recommended
Contractual provisions that improve governance maturity, operational clarity, accountability, scalability, or enterprise resilience.

Elevated Review
Conditions requiring additional legal, commercial, operational, security, or compliance attention.

Checklist Evaluation Principles
Checklist items should be interpreted using a risk-based approach.
Absence of a recommended provision does not automatically indicate unacceptable enterprise risk.
Evaluation should consider:
• agreement purpose
• business context
• contract criticality
• compensating controls
• related contractual protections
• operational practicality
Agreements should be evaluated holistically rather than by mechanically counting missing provisions.
The presence of a contractual provision does not necessarily indicate that enterprise risk is adequately addressed. Existing contractual language may still create elevated enterprise exposure where obligations are ambiguous, operationally weak, commercially imbalanced, incomplete, or insufficiently enforceable.

Agreement Maturity
Different agreement types naturally contain different levels of contractual detail.
Short-form agreements may intentionally omit provisions commonly found in comprehensive enterprise agreements.
Review findings should consider the intended scope and maturity of the agreement before classifying omissions as material gaps.

General Agreement Standards
Most enterprise agreements should reasonably define:
• parties and scope
• payment obligations
• confidentiality expectations
• liability allocation
• termination conditions
• operational responsibilities
• dispute handling
• governing law and jurisdiction
Elevated review may be appropriate where agreements contain:
• conflicting obligations
• undefined ownership rights
• vague operational commitments
• ambiguous accountability
• disproportionate risk allocation

NDA Checklist
Generally Required
• confidentiality obligations
• definition of confidential information
• permitted disclosure conditions
• protection obligations
• return or destruction obligations
• survival provisions
• governing law

Recommended
• disclosure tracking expectations
• security handling obligations
• defined retention timelines
• permitted internal sharing limitations

Elevated Review
• overly broad confidentiality exclusions
• unrestricted disclosure rights
• undefined survival periods
• unclear treatment of derived information
• conflicting confidentiality obligations

SaaS Agreement Checklist
Generally Required
• service description
• pricing structure
• payment terms
• SLA or uptime commitments
• support obligations
• security responsibilities
• data handling provisions
• confidentiality obligations
• limitation of liability
• termination provisions

Recommended
• disaster recovery commitments
• service credit framework
• audit rights
• subcontractor disclosure
• incident notification timelines
• change management process
• AI and data usage restrictions

Elevated Review
• vague SLA language
• undefined support scope
• unrestricted pricing changes
• broad data usage rights
• missing operational accountability
• undefined security obligations
• unrestricted AI training rights

Master Services Agreement (MSA) Checklist
Generally Required
• scope governance
• statement of work framework
• payment governance
• liability allocation
• confidentiality obligations
• intellectual property treatment
• termination provisions
• dispute resolution process
• subcontractor responsibilities

Recommended
• escalation procedures
• change request governance
• service acceptance process
• operational reporting obligations
• auditability provisions
• transition assistance obligations

Elevated Review
• undefined ownership structure
• conflicting operational obligations
• vague service governance
• unlimited liability exposure
• unclear subcontractor accountability
• absence of operational escalation paths

Vendor Agreement Checklist
Generally Required
• service obligations
• pricing and payment structure
• confidentiality protections
• operational accountability
• compliance obligations
• audit rights
• termination provisions
• liability framework

Recommended
• insurance obligations
• subcontractor disclosure
• performance reporting
• business continuity expectations
• governance review process
• service escalation obligations

Elevated Review
• weak accountability mechanisms
• undefined vendor obligations
• absence of auditability
• dependency on unidentified third parties
• unclear operational ownership
• vague compliance responsibilities

Data Processing Agreement (DPA) Checklist
Generally Required
• processing purpose
• categories of data
• data handling obligations
• confidentiality obligations
• breach notification obligations
• subprocessors
• retention and deletion commitments
• cross-border transfer provisions
• audit rights

Recommended
• encryption expectations
• access control obligations
• incident response cooperation
• regulatory assistance obligations
• security review rights
• processing transparency requirements

Elevated Review
• unrestricted data usage rights
• undefined processor obligations
• missing breach notification timelines
• unclear subprocessing controls
• weak retention and deletion language
• vague international transfer protections

Clause Sufficiency Standards
Presence of a contractual provision alone does not indicate adequacy.
Review should evaluate whether contractual language is:
• sufficiently complete
• operationally clear
• enforceable
• measurable where appropriate
• internally consistent
• aligned with related obligations
Weak, ambiguous, incomplete, commercially imbalanced, operationally unclear, or insufficiently defined contractual language should generally be treated as a Risk rather than a Gap where the underlying contractual protection already exists.

Gap Types
Complete Gap
An expected contractual protection, governance obligation, operational safeguard, or enterprise control is entirely absent from the agreement.
Examples:
• no confidentiality obligations
• no audit rights
• no breach notification obligations
• no deletion commitments
• no liability limitation structure

Risk Indicators
Where contractual language exists but is weak, ambiguous, incomplete, commercially imbalanced, operationally unclear, or insufficiently enforceable, findings should generally be treated as Risks rather than Gaps.
Examples:
• breach notification obligations exist but no timeline is defined
• security obligations exist but are overly generic
• audit rights exist but are operationally restricted
• deletion obligations exist but timelines are ambiguous
• AI governance provisions exist but permit broad unrestricted usage

Cross-Clause Validation Standards
Review should identify:
• conflicting obligations
• inconsistent definitions
• contradictory timelines
• duplicated accountability
• incompatible operational commitments
• inconsistent ownership treatment
Cross-clause inconsistencies may create elevated operational, legal, or governance risk even where individual clauses appear acceptable.

Contextual Review
Checklist evaluation should consider the broader contractual package, including:
• schedules
• exhibits
• statements of work
• incorporated policies
• referenced appendices
• supporting contractual documents
A missing provision within the primary agreement may be satisfied through incorporated contractual materials.

Compensating Controls
A missing contractual protection may be partially offset by protections elsewhere in the agreement.
Examples include:
• enhanced audit rights compensating for weaker reporting obligations
• stronger liability protections compensating for limited insurance obligations
• governance committees compensating for reduced operational reporting
• enhanced monitoring obligations compensating for simplified service governance
Compensating controls should reduce, but not eliminate, review attention.

Gap Detection Standards
Potential gaps may exist where:
• expected protections are absent
• governance obligations are entirely omitted
• operational safeguards do not exist
• accountability mechanisms are absent
• required enterprise controls are missing
Where contractual language exists but is weak, incomplete, vague, operationally unclear, commercially imbalanced, or insufficiently enforceable, findings should generally be classified as Risks rather than Gaps.
Gap severity should consider:
• business criticality
• operational dependency
• regulatory exposure
• customer impact
• financial exposure
• availability of compensating controls

Review Outputs
Checklist evaluation may produce:
• Missing Protection
• Weak Protection
• Operational Concern
• Governance Concern
• Clarification Needed
• Cross-Clause Conflict
• Recommendation
• Negotiation Opportunity

Professional Judgment
This checklist provides enterprise review guidance and does not replace contextual contract analysis.
Review findings should incorporate:
• contractual language
• business context
• enterprise objectives
• operational considerations
• legal reasoning
• governance expectations
Professional judgment should supplement checklist evaluation where appropriate.

AI-Assisted Review Guidance
AI-assisted review may support:
• clause completeness evaluation
• clause sufficiency assessment
• missing protection identification
• governance consistency review
• cross-clause validation
• operational dependency analysis
• recommendation generation
• negotiation prioritization
• enterprise risk identification
AI-generated findings should remain traceable to:
• contractual language
• agreement structure
• enterprise governance standards
• approved clause guidance

Checklist Interpretation for AI-Assisted Review
Checklist items should be treated as evaluation guidance rather than deterministic rules.
The absence of a checklist item does not necessarily indicate unacceptable enterprise risk.
Likewise, the presence of a checklist item does not guarantee contractual adequacy.
AI-assisted review should combine:
• contractual language
• enterprise governance standards
• business context
• checklist guidance
• professional reasoning
to produce balanced, explainable, and context-aware review findings.

Checklist Severity Signals
Missing protections affecting confidentiality, liability, security accountability, regulatory obligations, or ownership rights generally warrant elevated review attention.
Minor drafting ambiguity or governance refinements may warrant lower review priority.

Human Review Requirement
Technology-assisted contract review improves operational consistency and review efficiency; however, material legal, commercial, compliance, security, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_checklist,
      status: "enterprise_ready",
      ingestReady: false,
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
