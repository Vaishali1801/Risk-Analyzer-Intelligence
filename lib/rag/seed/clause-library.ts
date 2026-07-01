import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[5];

export const clauseLibrarySeed = [
  {
    id: "approved_clause_guidance-enterprise-v1",
    collection: COLLECTION,
    title: "Approved Clause Guidance",
    sourceType: "approved_clause_library",
    version: "1.0.0",
    tags: ["clause-library", "drafting", "fallback-language", "approved-guidance"],
    content: `Northstar Cloud Intelligence (NCI) – Approved Clause Guidance

Purpose
This document defines preferred contractual guidance, fallback negotiation positions, and approved clause principles used by Northstar Cloud Intelligence (NCI) during enterprise contract review and negotiation.
The document supports:
• recommendation generation
• clause improvement guidance
• negotiation support
• gap remediation
• clause standardization
• AI-assisted contract analysis
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review & Negotiation Playbook
• Contract Review Checklist & Standards
• Security & Compliance Standards

Guidance Interpretation
Preferred Position
Represents contractual language and obligations generally aligned with NCI governance, operational, legal, commercial, security, and compliance expectations.

Acceptable Alternative
Represents contractual language that may be acceptable depending upon:
• agreement scope
• business context
• compensating controls
• operational feasibility
• commercial value
• overall risk profile

Elevated Review
Represents contractual language patterns that may create elevated legal, financial, operational, compliance, or security exposure and generally warrant negotiation or additional review.

Guidance Principles
Approved clause guidance should:
• remain commercially reasonable
• support operational enforceability
• improve accountability
• reduce ambiguity
• maintain scalability
• align with governance expectations
• support long-term operational sustainability
Recommendations should avoid:
• unnecessary legal complexity
• unrealistic operational obligations
• vague accountability
• conflicting responsibilities
• disproportionate risk allocation

Recommendation Strategy
Clause recommendations should preserve the underlying commercial intent while improving contractual quality and enterprise governance.
Recommendations may be generated using one of the following strategies.
Protective
Strengthens governance and reduces enterprise exposure by increasing accountability, clarifying obligations, and reducing ambiguity.
Suitable where enterprise risk is elevated.

Balanced
Seeks commercially reasonable allocation of obligations while maintaining acceptable governance protections for both parties.
Suitable for most enterprise negotiations.

Simplified
Improves readability, clarity, and operational understanding without materially changing contractual intent.
Suitable where legal complexity unnecessarily obscures obligations.

Clause Quality Dimensions
Clause evaluation should consider multiple dimensions rather than only determining whether language is acceptable or unacceptable.
Review should assess:
• clarity
• specificity
• enforceability
• completeness
• operational feasibility
• governance alignment
• internal consistency
• commercial balance
• scalability
• accountability
Weakness in any dimension may justify clarification, negotiation, or recommendation even where contractual protections already exist.
Where expected contractual protections, governance mechanisms, operational safeguards, or accountability obligations are entirely absent from the agreement, review findings may indicate enterprise governance Gaps requiring remediation or negotiation.

Confidentiality Guidance
Preferred Position
Confidential information should be clearly defined and reasonably protected against unauthorized use or disclosure.
Generally Preferred Elements
• definition of confidential information
• permitted disclosure limitations
• reasonable protection obligations
• return or destruction obligations
• survival obligations after termination
Acceptable Alternative
Reasonable confidentiality exclusions or operational carve-outs may be acceptable where protections remain commercially and operationally appropriate.
Elevated Review
• unrestricted disclosure rights
• vague confidentiality scope
• undefined survival obligations
• excessive confidentiality exclusions
• absence of protection obligations

Liability Guidance
Preferred Position
Liability allocation should remain proportionate, commercially balanced, and reasonably aligned with contract value and operational risk.
Generally Preferred Elements
• defined liability limitations
• balanced indemnification structure
• reasonable exclusions and carve-outs
• proportional allocation of responsibility
Acceptable Alternative
Alternative liability structures may be acceptable where:
• exposure remains measurable
• compensating protections exist
• operational accountability is preserved
Elevated Review
• unlimited liability
• uncapped indirect damages
• asymmetric liability allocation
• broad indemnification obligations
• undefined limitation structure

Payment & Commercial Guidance
Preferred Position
Commercial obligations should remain predictable, measurable, and operationally manageable.
Generally Preferred Elements
• defined pricing structure
• measurable payment triggers
• reasonable invoicing timelines
• advance notice for pricing changes
• commercially reasonable renewal terms
Acceptable Alternative
Flexible pricing or renewal structures may be acceptable where:
• calculation methods remain objective
• notice periods are reasonable
• contractual remedies remain meaningful
Elevated Review
• unilateral pricing authority
• vague payment triggers
• undefined acceptance conditions
• disproportionate financial penalties
• automatic renewal without notice

Security & Data Protection Guidance
Preferred Position
Contracts involving enterprise systems, cloud services, or customer data should define reasonable security, privacy, and operational accountability obligations.
Generally Preferred Elements
• security responsibility allocation
• incident notification obligations
• access control expectations
• confidentiality protections
• subprocessor transparency
• reasonable auditability
Acceptable Alternative
Alternative governance mechanisms may be acceptable where operational protections remain sufficient through:
• reporting obligations
• enhanced oversight
• monitoring mechanisms
• compensating operational controls
Elevated Review
• unrestricted data usage rights
• undefined security obligations
• vague incident accountability
• unrestricted AI model training rights
• absence of subprocessor accountability

Intellectual Property Guidance
Preferred Position
Ownership and licensing rights should remain clearly defined, operationally practical, and commercially balanced.
Generally Preferred Elements
• protection of pre-existing intellectual property
• defined licensing rights
• explicit ownership treatment
• clear handling of custom deliverables
Acceptable Alternative
Alternative licensing structures may be acceptable where:
• ownership remains sufficiently clear
• business objectives remain protected
• operational usage rights remain practical
Elevated Review
• vague ownership language
• implied intellectual property transfer
• unrestricted reuse rights
• undefined licensing boundaries

Operational Governance Guidance
Preferred Position
Operational commitments should remain measurable, scalable, and operationally achievable.
Generally Preferred Elements
• defined support responsibilities
• escalation procedures
• service governance mechanisms
• change management expectations
• operational reporting obligations
Acceptable Alternative
Simplified governance structures may be acceptable where:
• operational scope is limited
• risk exposure remains manageable
• accountability remains sufficiently defined
Elevated Review
• undefined support obligations
• unrealistic service commitments
• absence of escalation processes
• vague operational accountability
• unclear dependency ownership

Audit & Compliance Guidance
Preferred Position
Agreements should support reasonable auditability, regulatory cooperation, and accountability for operational obligations.
Generally Preferred Elements
• reasonable audit rights
• compliance cooperation obligations
• subcontractor accountability
• maintenance of relevant operational records
Acceptable Alternative
Reduced audit scope may be acceptable where:
• independent assessments exist
• reporting obligations compensate for reduced visibility
• operational risk remains manageable
Elevated Review
• absence of auditability
• vague compliance obligations
• undisclosed subcontractors
• inability to validate operational controls

AI Governance Guidance
Preferred Position
Contracts involving AI-enabled services or AI-assisted processing should define reasonable governance, accountability, and customer data protections.
Generally Preferred Elements
• defined AI usage scope
• customer data usage limitations
• accountability for AI-enabled outputs
• transparency regarding AI-assisted functionality
• restrictions on unauthorized model training
Acceptable Alternative
Alternative AI governance approaches may be acceptable where:
• customer protections remain sufficient
• operational accountability remains clear
• governance controls remain enforceable
Elevated Review
• unrestricted AI training rights
• undefined AI accountability
• undisclosed AI-assisted processing
• vague ownership of AI-generated outputs
• unrestricted customer data reuse

Agreement-Type Priorities
NDA
Primary review emphasis:
• confidentiality
• disclosure limitations
• retention obligations
• survival provisions

SaaS Agreement
Primary review emphasis:
• SLA commitments
• security governance
• uptime
• resilience
• AI and data usage rights

Master Services Agreement
Primary review emphasis:
• liability allocation
• operational governance
• payment governance
• subcontractor accountability
• service management

Vendor Agreement
Primary review emphasis:
• operational accountability
• auditability
• vendor oversight
• compliance obligations
• business continuity

Data Processing Agreement
Primary review emphasis:
• processing limitations
• subprocessor governance
• retention and deletion
• cross-border transfers
• breach notification

Clause Sufficiency
Presence of a contractual clause alone does not indicate adequacy.
Review should determine whether language is:
• operationally clear
• measurable where appropriate
• enforceable
• proportionate to enterprise risk
• internally consistent
• aligned with related contractual obligations
Generic, ambiguous, incomplete, commercially imbalanced, operationally unclear, or insufficiently enforceable language may create contractual Risk exposure even where the underlying contractual protection exists.

Cross-Clause Validation
Review should identify inconsistencies affecting:
• liability allocation
• confidentiality treatment
• ownership rights
• operational governance
• auditability
• security accountability
• AI and data usage permissions
Cross-clause inconsistencies may create elevated enterprise risk even where individual clauses appear acceptable.

Compensating Controls
Where preferred contractual language cannot be obtained, alternative protections may partially reduce exposure.
Examples include:
• enhanced reporting obligations
• stronger liability protections
• governance committees
• operational monitoring
• executive approvals
• independent assessments
• enhanced audit rights
Compensating controls should reduce, but not eliminate, elevated review attention.

Recommendation Confidence
Recommendation confidence should consider:
• clarity of contractual language
• completeness of supporting evidence
• consistency with governance standards
• internal contractual consistency
• existence of compensating controls
High-confidence recommendations should be strongly supported by contractual evidence and governance guidance.
Medium-confidence recommendations may require assumptions or partial interpretation.
Low-confidence recommendations should be clearly identified for human review.

Industry Best-Practice Guidance
Enterprise guidance represents NCI's preferred governance position but is not exhaustive.
Where enterprise documentation does not explicitly address a contractual issue, recommendations may also consider generally accepted legal, commercial, operational, security, privacy, or AI governance practices, provided findings remain grounded in the contractual language.
This allows identification of novel or emerging contractual risks that may not yet be reflected in enterprise documentation.

AI-Assisted Guidance
AI-assisted review may support:
• clause sufficiency analysis
• clause quality assessment
• recommendation generation
• clause improvement suggestions
• negotiation support
• governance consistency review
• operational accountability assessment
• cross-clause validation
• identification of elevated review areas
Recommendations should remain grounded in:
• contractual language
• enterprise governance standards
• business context
• operational practicality
• approved guidance
• industry best practices where appropriate

Interpretation
Approved guidance should be interpreted using a contextual and risk-based approach.
Absence of preferred wording does not automatically indicate unacceptable enterprise risk.
Likewise, preferred wording does not guarantee operational sufficiency.
Review should consider:
• agreement scope
• business criticality
• compensating controls
• operational feasibility
• security exposure
• commercial objectives
• overall contractual balance
Professional judgment should supplement guidance where appropriate.

Human Review Requirement
Technology-assisted contract review improves consistency and operational efficiency; however, material legal, commercial, compliance, security, operational, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.clause_library,
      status: "enterprise_ready",
      ingestReady: false,
      chunkPreparation: {
        chunkType: "clause_guidance",
        domains: ["Legal", "Compliance", "Technical", "Financial", "Operational"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "approved_clause_guidance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["approved clause", "fallback language", "drafting", "contract remedy"]
      }
    }
  }
] satisfies KBSeedDocument[];
