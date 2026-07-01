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
    content: `Northstar Cloud Intelligence (NCI) – Procurement Governance Policy

Purpose
This document defines procurement governance expectations used by Northstar Cloud Intelligence (NCI) during evaluation of vendors, suppliers, service providers, and enterprise technology agreements.
The policy supports:
• vendor governance evaluation
• operational dependency assessment
• third-party risk analysis
• procurement-related gap identification
• contract review prioritization
• contract acceptance guidance
• AI-assisted contract analysis workflows
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review & Negotiation Playbook
• Contract Review Checklist & Standards
• Security & Compliance Standards
• Approved Clause Guidance

Procurement Governance Philosophy
NCI views procurement governance as a strategic enterprise function supporting:
• operational resilience
• customer trust
• scalable service delivery
• vendor accountability
• regulatory alignment
• sustainable long-term partnerships
Vendor relationships should balance:
• commercial value
• operational feasibility
• governance maturity
• enterprise risk exposure
• service reliability
Procurement decisions should consider both contractual protections and broader business context.

Risk-Based Vendor Evaluation
Vendor evaluation should consider:
• operational dependency
• service criticality
• access to enterprise systems
• customer data exposure
• regulatory impact
• subcontractor reliance
• concentration risk
• business continuity impact
• AI-enabled processing
• financial and commercial exposure
Higher-risk vendors generally warrant stronger contractual protections, oversight, governance controls, and executive visibility.

Vendor Criticality Classification
Tier 1 – Critical Vendor
Typically supports:
• business-critical operations
• production cloud infrastructure
• enterprise AI platforms
• regulated processing activities
• customer-facing services
• mission-critical systems
Generally expected to include:
• enhanced auditability
• business continuity commitments
• disaster recovery obligations
• transition assistance
• executive governance
• periodic governance reviews

Tier 2 – High Impact Vendor
Typically supports important operational capabilities or sensitive enterprise functions.
Generally expected to include:
• defined service governance
• operational reporting
• subcontractor transparency
• security accountability
• escalation mechanisms

Tier 3 – Standard Vendor
Supports routine operational activities with moderate business dependency.
Governance expectations should remain proportionate to operational and contractual risk.

Tier 4 – Low Risk Vendor
Provides low-impact services with limited operational dependency and minimal enterprise exposure.
Simplified governance controls may be appropriate where business risk remains low.

Procurement Review Priorities
Procurement review should generally prioritize:
• operational accountability
• subcontractor governance
• auditability
• business continuity
• security obligations
• service reliability
• concentration risk
• financial stability indicators
• dependency management
• transition support
• commercial governance
• pricing transparency
• renewal governance

Commercial Governance Review
Procurement evaluation should reasonably consider:
• pricing transparency
• payment structure
• renewal mechanisms
• automatic renewal provisions
• termination fees
• minimum purchase commitments
• volume commitments
• price adjustment mechanisms
• financial predictability
Commercial provisions should remain operationally manageable and commercially balanced.

Vendor Governance Standards
Generally Required
• clearly defined service responsibilities
• operational accountability
• confidentiality protections
• compliance with applicable law
• reasonable auditability
• defined termination rights
• subcontractor transparency where applicable

Recommended
• business continuity obligations
• disaster recovery coordination
• operational reporting expectations
• governance review mechanisms
• escalation procedures
• insurance obligations
• performance measurement expectations
• transition assistance obligations

Elevated Review
• undefined operational ownership
• unrestricted subcontracting
• weak audit rights
• vague service obligations
• excessive operational dependency
• unclear accountability allocation
• absence of transition support obligations
Elevated review conditions may arise from either missing governance protections (Gaps) or existing contractual language that creates operational, commercial, compliance, or accountability exposure (Risks).

Operational Dependency Standards
Vendor relationships creating material operational dependency should reasonably address:
• continuity expectations
• escalation responsibilities
• service transition support
• resilience planning
• dependency transparency
• operational communication expectations

Elevated Review
• single-vendor dependency without contingency planning
• undefined continuity obligations
• absence of transition support
• operational concentration risk
• unclear responsibility during disruption events

Vendor Concentration Risk
Procurement review should evaluate potential concentration risk arising from:
• dependence on a single supplier
• lack of alternative providers
• concentration of critical services
• geographic concentration
• cloud platform dependency
• AI platform dependency
Where concentration risk exists, contracts should reasonably support resilience and transition planning.

Transition Assistance Expectations
Where vendors support critical business operations, agreements should reasonably address:
• transition assistance
• knowledge transfer
• data export support
• migration cooperation
• post-termination operational support
• reasonable service handover obligations
Missing transition obligations may create elevated operational risk.

Subcontractor Governance
Where subcontractors support contractual obligations, agreements should reasonably define:
• subcontractor accountability
• oversight responsibilities
• notification obligations
• security inheritance expectations
• compliance responsibilities

Elevated Review
• undisclosed subcontractors
• unrestricted subcontractor usage
• unclear oversight obligations
• undefined accountability allocation

Auditability Standards
Vendor agreements should generally support reasonable verification of:
• operational obligations
• compliance responsibilities
• security expectations
• governance commitments
• service performance where appropriate

Elevated Review
• inability to validate operational controls
• absence of audit rights
• undefined reporting obligations
• limited governance visibility

Business Continuity Expectations
Vendors supporting material business operations should reasonably maintain:
• continuity planning
• operational recovery expectations
• disruption communication processes
• resilience coordination mechanisms

Recommended
• disaster recovery coordination
• resilience testing expectations
• service restoration communication
• continuity reporting obligations

Elevated Review
• absence of continuity expectations
• vague recovery obligations
• undefined outage communication
• excessive operational concentration

AI Vendor Governance
Where vendors provide AI-enabled capabilities, agreements should reasonably address:
• disclosure of AI-assisted processing
• AI usage affecting enterprise or customer data
• governance over AI-generated outputs
• customer data training restrictions
• accountability for automated decisions
• human oversight where appropriate
• explainability support where applicable

Elevated Review
• unrestricted AI model training rights
• undisclosed AI processing
• undefined AI accountability
• unrestricted customer data reuse
• vague ownership of AI-generated outputs

Procurement Escalation Guidance
Procurement Review
Generally appropriate where:
• vendor risk is limited
• operational dependency is low
• standard commercial terms apply
• no material governance concerns exist

Procurement + Legal Review
Generally appropriate where:
• liability allocation is significant
• intellectual property rights are material
• termination rights are imbalanced
• unusual commercial obligations exist

Procurement + Security Review
Generally appropriate where:
• customer data is processed
• privileged system access exists
• AI-enabled services are provided
• cloud infrastructure is involved
• regulated information is handled

Executive Review
Generally appropriate where:
• strategic operational dependency exists
• sole-source vendor relationships exist
• material financial exposure exists
• enterprise-wide service dependency exists
• significant outsourcing risk exists

Contract Acceptance Guidance
Following review, agreements may generally be categorized as:
• Accept
• Accept with Compensating Controls
• Negotiate
• Escalate for Approval
• Reject
Classification should consider:
• severity of identified risks
• number of critical gaps
• operational dependency
• vendor criticality
• compensating controls
• overall business context

Procurement Risk & Gap Interpretation
Gap
A procurement governance protection, operational safeguard, accountability mechanism, or vendor governance control that is entirely absent from the agreement.
Examples:
• no audit rights for a critical vendor
• no transition assistance obligations
• no subcontractor disclosure obligations
• no business continuity commitments
• no operational escalation process

Risk
A procurement governance provision that exists but introduces operational, commercial, governance, compliance, or accountability exposure due to weak, vague, incomplete, commercially imbalanced, operationally unclear, or insufficiently enforceable language.
Examples:
• subcontractor disclosure exists but notification obligations are undefined
• business continuity commitments are generic and operationally vague
• audit rights exist but are operationally restricted
• transition assistance exists but duration and scope are undefined
• service reporting obligations exist but metrics are discretionary

Cross-Clause Procurement Validation
Review should identify inconsistencies affecting:
• operational accountability
• subcontractor obligations
• auditability
• continuity responsibilities
• service governance
• escalation ownership
• transition support obligations
Cross-clause inconsistencies may create operational or governance exposure even where individual clauses appear acceptable.

Compensating Controls
Where preferred procurement protections cannot be obtained, alternative controls may partially reduce exposure.
Examples include:
• enhanced reporting obligations
• independent assessments
• governance committees
• executive oversight
• operational monitoring
• stronger transition assistance
• enhanced audit rights
• stronger security commitments
Compensating controls should reduce, but not eliminate, elevated review attention.

Procurement Recommendation Principles
Recommendations should:
• improve operational accountability
• strengthen governance visibility
• preserve operational feasibility
• support enforceability
• maintain commercially reasonable obligations
• improve resilience and continuity
• reduce unmanaged dependency risk
Recommendations should remain proportionate to:
• vendor criticality
• operational dependency
• business impact
• data sensitivity
• enterprise exposure

AI-Assisted Procurement Review
AI-assisted review may support:
• vendor governance evaluation
• operational dependency analysis
• subcontractor governance review
• procurement-related gap identification
• auditability assessment
• continuity risk analysis
• contract acceptance guidance
• escalation recommendation generation
• prioritization of elevated review conditions
AI-generated findings should remain grounded in:
• contractual language
• governance standards
• operational context
• approved enterprise guidance

Interpretation
This policy should be interpreted using a contextual and risk-based approach.
The absence of a specific governance control does not automatically indicate unacceptable enterprise risk.
Likewise, the presence of a governance provision does not guarantee operational sufficiency.
Review should consider:
• vendor criticality
• operational dependency
• business context
• compensating controls
• resilience expectations
• commercial objectives
• overall contractual accountability
Professional judgment should supplement procurement evaluation where appropriate.

Human Review Requirement
Technology-assisted procurement review improves governance consistency and operational efficiency; however, material commercial, operational, legal, compliance, security, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.procurement_policy,
      status: "enterprise_ready",
      ingestReady: false,
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
