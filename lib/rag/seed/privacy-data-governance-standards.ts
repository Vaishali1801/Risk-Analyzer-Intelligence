import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[7];

export const privacyDataGovernanceStandardsSeed = [
  {
    id: "privacy_data_governance_standards-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Privacy and Data Governance Standards",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["privacy", "data-governance", "data-use", "retention", "ai-governance"],
    content: `Northstar Cloud Intelligence (NCI) – Privacy & Data Governance Standards

Purpose
This document defines enterprise privacy, data governance, AI data usage, and information handling expectations used by Northstar Cloud Intelligence (NCI) during evaluation of enterprise agreements, cloud services, AI-enabled platforms, and third-party operational relationships.
The standards support:
• privacy and data governance evaluation
• AI governance analysis
• data usage review
• retention and deletion assessment
• cross-border processing evaluation
• subprocessor governance analysis
• contractual gap identification
• AI-assisted contract analysis
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review & Negotiation Playbook
• Contract Review Checklist & Standards
• Security & Compliance Standards
• Approved Clause Guidance
• Procurement Governance Policy

Governance Philosophy
NCI views customer and enterprise data as a strategic asset requiring responsible governance, operational accountability, and commercially reasonable protections.
Data governance expectations should:
• support customer trust
• preserve operational practicality
• maintain transparency of data usage
• align with business criticality
• scale proportionately with sensitivity and operational dependency
• support responsible AI adoption
The objective is to balance innovation, operational scalability, analytics capability, and AI enablement with appropriate enterprise governance protections.

Risk-Based Data Governance
Data governance obligations should be evaluated proportionate to:
• data sensitivity
• customer impact
• operational dependency
• regulatory exposure
• AI processing scope
• geographic processing footprint
• subcontractor involvement
• cross-border processing activity
Higher-risk processing activities generally warrant stronger contractual protections, transparency, accountability, and governance controls.

Customer Data Principles
Unless otherwise agreed:
• customers retain ownership of Customer Data
• providers may process Customer Data only for authorized contractual purposes
• Customer Data usage should remain proportionate to operational necessity
• Customer Data should not be reused beyond authorized governance boundaries
• operational access should remain reasonably controlled and accountable

AI & Derived Data Governance
Contracts involving AI-enabled services, analytics platforms, machine learning systems, or AI-assisted processing should reasonably define governance boundaries relating to:
• model training
• AI-assisted processing
• embeddings
• vectorized representations
• derived datasets
• telemetry usage
• operational analytics
• generated outputs
• model improvement activities
Generally Required
• defined AI usage scope
• reasonable transparency regarding AI-assisted functionality
• restrictions on unauthorized customer data reuse
• accountability for AI-enabled processing
• governance over training data usage
• protection of customer-identifiable information
Recommended
• explicit treatment of embeddings and derived representations
• governance over model training artifacts
• defined retention expectations for derived datasets
• defined retention expectations for AI model artifacts
• governance over customer-specific fine-tuning datasets
• governance over embeddings following contract termination
• customer opt-out mechanisms where operationally appropriate
• disclosure of material AI-enabled processing activities
• transparency regarding significant automated processing where appropriate
Elevated Review
• unrestricted AI model training rights
• undefined derived-data ownership
• broad reuse of customer operational data
• vague AI accountability
• undisclosed AI-assisted processing
• unrestricted telemetry exploitation
• undefined governance for embeddings or vectorized data
• unrestricted retention of AI model artifacts after termination
Elevated review conditions may arise from either missing governance protections (Gaps) or existing contractual language that creates operational, privacy, security, compliance, AI governance, or accountability exposure (Risks).

Data Usage Governance
Contracts should reasonably define:
• permitted data usage purposes
• operational processing boundaries
• internal analytics usage rights
• benchmarking limitations
• anonymization expectations
• restrictions on customer-identifiable reuse
Elevated Review
• undefined processing scope
• unrestricted internal research usage
• broad derivative-data exploitation
• ambiguous anonymization standards
• unclear distinction between Customer Data and derived operational data
• absence of safeguards preventing re-identification of anonymized information

Retention & Deletion Standards
Contracts involving Customer Data should reasonably address:
• retention expectations
• deletion obligations
• backup retention handling
• operational recovery limitations
• post-termination processing expectations
Generally Required
• defined deletion expectations
• operational retention governance
• treatment of archived or backup data
• retention aligned with operational necessity
Recommended
• deletion certification processes
• defined retention timelines
• restricted backup accessibility
• defined treatment of derived datasets after termination
• deletion expectations for customer-specific AI training datasets
• deletion expectations for customer-specific embeddings and vectorized representations
Elevated Review
• indefinite retention rights
• undefined deletion timelines
• unrestricted retention of operational derivatives
• vague backup governance
• unclear post-termination obligations
• indefinite retention of AI-generated derivatives without governance

Cross-Border Processing Governance
Contracts involving international operations or geographically distributed services should reasonably address:
• cross-border processing expectations
• regional operational considerations
• subprocessor transparency
• operational accountability across jurisdictions
Recommended
• defined approved hosting regions
• notification of material data residency changes
• contractual commitments regarding geographic processing locations where operationally appropriate
Elevated Review
• undefined international processing scope
• vague transfer accountability
• undisclosed regional subprocessors
• unclear jurisdictional responsibilities

Subprocessor Data Governance
Where subprocessors or third-party service providers access Customer Data, agreements should reasonably define:
• subprocessor accountability
• operational oversight
• notification obligations
• governance inheritance expectations
• responsibility allocation
Recommended
• customer notification for material subprocessor changes
• objection mechanisms for elevated-risk subprocessors
• operational accountability continuity
Elevated Review
• unrestricted subprocessor engagement
• undefined oversight responsibilities
• absence of customer notification
• unclear accountability allocation
• objection rights without practical resolution mechanisms

Privacy & Security Accountability
Data governance obligations should reasonably align with security and operational accountability expectations.
Contracts should generally support:
• access accountability
• confidentiality protections
• incident response coordination
• operational monitoring
• reasonable auditability
• cooperation regarding material privacy or security events

Data Minimization Expectations
Customer Data processing should remain reasonably proportionate to:
• contractual scope
• operational necessity
• support obligations
• analytics requirements
• authorized AI-enabled functionality
Excessive or unrelated data collection, retention, or reuse may create elevated governance exposure.

Data Portability Expectations
Contracts should reasonably support:
• customer access to exported data
• machine-readable export formats
• commercially reasonable export assistance
• defined export availability periods after termination
• preservation of portability rights independent of deletion obligations
Elevated Review
• absence of export rights
• undefined export timelines
• proprietary export formats creating lock-in
• deletion rights that effectively eliminate practical portability

Data Governance Trade-Offs
Reduced governance protections in one area may be partially offset by compensating controls elsewhere.
Examples include:
• reduced audit rights balanced by independent assessments
• broad analytics usage balanced by strict anonymization governance
• limited deletion obligations balanced by restricted operational access
• reduced visibility balanced by enhanced reporting obligations
Data governance evaluation should assess agreements holistically rather than analyzing clauses independently.

Privacy & Data Governance Risk & Gap Interpretation
Gap
A material privacy, AI governance, data governance, operational accountability, or enterprise protection mechanism that is entirely absent from the agreement.
Examples:
• no breach notification obligations
• no deletion rights
• no portability rights
• no subprocessor disclosure obligations
• no AI governance provisions
• no cross-border processing provisions
• no customer opt-out mechanism for AI training
• no governance over derived-data ownership

Risk
A contractual privacy, AI governance, or data governance provision that exists but creates operational, compliance, security, governance, or customer trust exposure due to vague, weak, incomplete, commercially imbalanced, operationally unclear, or insufficiently enforceable language.
Examples:
• deletion obligations exist but no timeline is defined
• anonymization language exists but governance standards are undefined
• AI training rights are broadly drafted
• retention obligations permit indefinite derivative-data retention
• subprocessor objection rights exist without meaningful remediation mechanisms
• portability rights exist but export timelines are undefined
• cross-border processing rights are broad and operationally unclear

Cross-Clause Data Governance Validation
Review should identify inconsistencies affecting:
• data ownership
• AI training permissions
• retention obligations
• deletion expectations
• subprocessor governance
• analytics usage rights
• confidentiality treatment
• operational processing scope
Cross-clause inconsistencies may create elevated governance or compliance exposure even where individual clauses appear acceptable.

Privacy & Data Governance Review Outputs
Review may produce:
• Data Governance Concern
• AI Governance Concern
• Privacy Concern
• Retention Concern
• Subprocessor Governance Concern
• Weak Protection
• Missing Protection
• Cross-Clause Conflict
• Clarification Needed
• Recommendation
• Negotiation Opportunity

Data Governance Risk Prioritization Matrix
Finding | Default Priority
Unrestricted AI model training rights | Critical
Undefined derived-data ownership | High
Missing breach notification obligations | High
Unrestricted customer data reuse | High
Undefined deletion timelines | Medium
Weak anonymization governance | Medium
Undefined AI artifact retention | Medium
Missing data portability provisions | Medium
Missing transparency reporting | Low
Missing data residency commitments | Low
The matrix provides default prioritization guidance and should be interpreted alongside contractual context, compensating controls, operational necessity, and overall enterprise exposure.

Evaluation Confidence
Confidence in privacy and governance findings should consider:
• clarity of contractual language
• consistency across related clauses
• completeness of governance obligations
• operational enforceability
• supporting contractual evidence
• existence of compensating controls

AI-Assisted Governance Review
AI-assisted review may support:
• AI governance analysis
• data usage evaluation
• retention assessment
• deletion governance analysis
• subprocessor governance review
• cross-clause validation
• identification of governance gaps
• recommendation generation
• prioritization of elevated review conditions
Findings should remain grounded in:
• contractual language
• enterprise governance standards
• operational context
• approved contractual guidance
• generally accepted enterprise governance practices

Interpretation
Privacy and data governance expectations should be interpreted using a contextual and risk-based approach.
The absence of a specific governance control does not automatically indicate unacceptable enterprise risk.
Likewise, the presence of a contractual protection does not guarantee operational sufficiency.
Review should consider:
• business context
• operational dependency
• AI processing scope
• data sensitivity
• compensating controls
• overall governance accountability
Professional judgment should supplement governance evaluation where appropriate.

Human Review Requirement
Technology-assisted governance review improves operational consistency and enterprise visibility; however, material legal, privacy, compliance, operational, security, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.privacy_data_governance_standards,
      status: "enterprise_ready",
      ingestReady: false,
      chunkPreparation: {
        chunkType: "standard",
        domains: ["Compliance", "Legal", "Technical", "Operational"],
        contractTypes: ["DPA", "SaaS", "Vendor", "MSA", "NDA"],
        governanceArea: "privacy_data_governance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["privacy", "data processing", "AI data use", "retention", "subprocessor"]
      }
    }
  }
] satisfies KBSeedDocument[];
