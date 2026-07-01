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
    content: `Northstar Cloud Intelligence (NCI) – Contract Review & Negotiation Playbook

Purpose
This document defines the contract review and negotiation principles used by Northstar Cloud Intelligence (NCI) during evaluation of enterprise agreements.
The playbook supports:
• negotiation guidance
• identification of contractual red flags
• prioritization of enterprise protections
• recommendation generation
• governance alignment
• enterprise contract review and negotiation processes
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review Checklists
• Security & Compliance Standards
• Approved Clause Guidance

Review Philosophy
NCI seeks agreements that are:
• commercially balanced
• operationally achievable
• scalable across enterprise operations
• aligned with customer trust and governance objectives
• reasonably measurable and enforceable
Contract review prioritizes:
• risk visibility
• operational accountability
• protection of enterprise and customer data
• sustainable commercial obligations
• long-term partnership viability

Negotiation Flexibility
Enterprise agreements should be evaluated using a risk-based approach.
Deviation from preferred contractual language does not necessarily require rejection.
Where business value justifies increased exposure, balanced alternative language, compensating controls, or operational mitigations may be acceptable.
The objective is to achieve commercially reasonable outcomes while maintaining acceptable enterprise risk.

General Negotiation Principles
NCI generally prefers:
• clearly defined contractual obligations
• measurable service expectations
• balanced allocation of liability
• transparent operational governance
• defined escalation and remediation processes
• reasonable auditability and accountability
The organization generally seeks to avoid contractual provisions that create disproportionate or unmanaged enterprise exposure, including:
• unpredictable financial obligations
• vague operational commitments
• unilateral commercial authority
• undefined ownership rights
• unrestricted third-party dependency
• ambiguous security responsibilities

Business Context Considerations
Recommendations should consider overall business context, including:
• strategic importance of the relationship
• contract value
• implementation complexity
• operational dependency
• regulatory sensitivity
• customer impact
• long-term partnership objectives
Equivalent contractual language may warrant different negotiation strategies depending on business context.

Agreement Review Priorities
During contract review, elevated attention should generally be given to:
• liability structure
• payment obligations
• data handling commitments
• security responsibilities
• auditability
• termination rights
• intellectual property ownership
• subcontractor usage
• operational dependencies
• AI and data usage rights

Review Sequence
Enterprise agreements should generally be reviewed in the following order:
1. Confidentiality
2. Intellectual Property
3. Liability
4. Security & Data Protection
5. Payment & Commercial Terms
6. Termination
7. Operational Commitments
8. Governance & Auditability
9. Miscellaneous Provisions
Earlier review areas often represent elevated contractual and governance risk, though prioritization may vary depending on agreement context.

Red Flag Indicators
The following conditions generally require elevated review attention or negotiation.
Commercial Red Flags
• unilateral pricing increases
• undefined payment triggers
• uncapped credits or refund exposure
• automatic renewal without notice
• disproportionate financial penalties

Legal Red Flags
• unlimited liability exposure
• broad indemnification obligations
• unclear ownership provisions
• unrestricted termination rights
• conflicting contractual obligations

Compliance Red Flags
• missing audit rights
• vague regulatory obligations
• undefined breach notification process
• unclear data retention obligations
• undisclosed subprocessors

Operational Red Flags
• undefined support commitments
• unrealistic delivery obligations
• missing escalation procedures
• absence of change management processes
• dependency on unidentified third parties

Technical & Security Red Flags
• vague security commitments
• undefined disaster recovery expectations
• weak access control obligations
• unrestricted AI training on customer data
• absence of security incident accountability

Preferred Contract Positions
Liability
Preferred Position
Liability limitations should remain proportionate to contract value and reasonably balanced between parties.
Generally Preferred
• clearly defined liability caps
• explicit exclusions and carve-outs
• balanced indemnification structure
Fallback Position
Alternative liability structures may be acceptable where overall enterprise exposure remains appropriately managed through complementary contractual protections.
Elevated Review Conditions
• unlimited liability exposure
• asymmetric liability allocation
• uncapped indirect damages

Pricing & Commercial Terms
Preferred Position
Commercial obligations should remain predictable, measurable, and operationally manageable.
Generally Preferred
• defined pricing structure
• advance notice for pricing changes
• measurable payment triggers
• reasonable renewal notice periods
Fallback Position
Reasonable pricing adjustment mechanisms may be acceptable where calculation methods are objective, advance notice is provided, and customers retain meaningful contractual remedies.
Elevated Review Conditions
• unilateral fee modification rights
• vague billing terms
• undefined acceptance criteria tied to payment

Security & Data Handling
Preferred Position
Contracts involving enterprise or customer data should include appropriate operational and security accountability.
Generally Preferred
• defined security responsibilities
• incident notification obligations
• access control expectations
• subcontractor transparency
• reasonable auditability
Fallback Position
Where preferred security commitments cannot be obtained, additional monitoring, reporting, audit rights, or operational safeguards should be considered.
Elevated Review Conditions
• unrestricted data usage rights
• undefined security controls
• vague breach handling obligations
• absence of accountability for subprocessors

Intellectual Property
Preferred Position
Ownership and usage rights should remain explicitly defined and commercially reasonable.
Generally Preferred
• clear ownership boundaries
• defined licensing scope
• protection of pre-existing intellectual property
• explicit treatment of custom deliverables
Fallback Position
Alternative licensing structures may be acceptable where business objectives are preserved and enterprise intellectual property remains adequately protected.
Elevated Review Conditions
• vague ownership language
• unrestricted reuse rights
• implied transfer of intellectual property

Service Operations
Preferred Position
Operational commitments should remain measurable, supportable, and scalable.
Generally Preferred
• defined support responsibilities
• measurable SLA expectations
• documented escalation process
• defined acceptance process
• operational change governance
Fallback Position
Where operational commitments cannot be fully standardized, enhanced governance and reporting mechanisms should compensate for increased operational uncertainty.
Elevated Review Conditions
• unrealistic SLA commitments
• undefined support scope
• absence of operational governance mechanisms

Compensating Controls
Where preferred contractual protections cannot be obtained, reviewers should consider whether alternative controls sufficiently reduce enterprise exposure.
Examples include:
• enhanced audit rights
• additional reporting obligations
• insurance requirements
• service credits
• governance committees
• operational monitoring
• executive approvals
• enhanced security obligations
Compensating controls should be evaluated holistically rather than independently.

Negotiation Trade-offs
Acceptance of increased exposure in one contractual area may be appropriate where offsetting protections exist elsewhere.
Examples include:
• broader indemnity balanced by stronger liability limitations
• longer payment terms balanced by pricing stability
• enhanced SLA commitments balanced by limited service credits
• broader operational obligations balanced by stronger governance controls
Contract review should evaluate agreements holistically rather than assessing clauses in isolation.

Cross-Clause Consistency
Review should identify inconsistencies across the agreement, including:
• conflicting obligations
• inconsistent definitions
• contradictory timelines
• duplicated responsibilities
• incompatible operational commitments
• conflicting ownership provisions
Cross-clause inconsistency may create enterprise risk even where individual clauses appear acceptable.

Gap Prioritization Guidance
Must Add
Generally used where critical contractual protections, governance obligations, operational safeguards, or enterprise controls are entirely absent from the agreement.
Typical examples:
• no confidentiality obligations
• no liability limitation structure
• no security incident notification obligations
• no audit rights for critical vendors
• no ownership provisions
• no deletion obligations

Negotiate
Generally used where additional contractual protections, governance provisions, operational safeguards, or enterprise controls should be added to improve governance maturity, reduce exposure, or align with enterprise standards.
Typical examples:
• no AI training opt-out mechanism
• no transition assistance obligations
• no data residency commitments
• no portability assistance commitments
• no subprocessor objection mechanism
• no governance escalation framework

Optional
Generally used for lower-priority governance enhancements or additional contractual refinements that improve operational visibility, governance maturity, or enterprise consistency.
Typical examples:
• optional reporting enhancements
• governance review cadence provisions
• benchmarking rights
• operational transparency provisions
• enhanced notification procedures

Agreement-Type Guidance
NDA
Review emphasis:
• confidentiality scope
• permitted disclosures
• retention obligations
• disclosure timelines
• survival obligations

SaaS Agreement
Review emphasis:
• SLA commitments
• uptime expectations
• support obligations
• security accountability
• pricing governance
• data handling controls
• disaster recovery expectations

Master Services Agreement (MSA)
Review emphasis:
• liability structure
• payment governance
• operational accountability
• subcontractor management
• change management
• service governance

Vendor Agreement
Review emphasis:
• auditability
• operational dependencies
• service commitments
• compliance accountability
• vendor oversight obligations

Data Processing Agreement (DPA)
Review emphasis:
• privacy obligations
• subprocessors
• breach notification
• retention and deletion commitments
• cross-border transfer obligations
• audit rights

Escalation Guidance
The following conditions generally require elevated legal, security, compliance, or executive review:
• unlimited liability
• unrestricted customer data usage rights
• undefined ownership rights
• absence of confidentiality protections
• unrestricted AI training rights
• material regulatory exposure
• significant operational dependency risk

Recommendation Styles
AI-generated recommendations may be produced using different drafting styles depending on negotiation objectives.
Protective
Prioritizes enterprise risk reduction and stronger contractual protections.

Balanced
Seeks commercially reasonable allocation of obligations while maintaining acceptable enterprise risk.

Simplified
Improves readability and contractual clarity without materially changing legal intent.
Reviewers should select the recommendation style most appropriate for the negotiation context.

Recommendation Guidance
Recommendations should:
• preserve business intent
• remain operationally realistic
• align with governance standards
• avoid unnecessary contractual complexity
• improve clarity and accountability
• preserve enforceability
• support long-term operational scalability
• maintain consistency with related contractual provisions

Human Review Requirement
Technology-assisted contract review improves consistency and operational efficiency; however, material legal, commercial, compliance, security, and strategic decisions remain subject to appropriate human review and organizational approval.`,
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
