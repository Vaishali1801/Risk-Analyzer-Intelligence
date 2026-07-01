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
    content: `Northstar Cloud Intelligence (NCI) – Security & Compliance Standards

Purpose
This document defines baseline security, privacy, governance, and compliance expectations used by Northstar Cloud Intelligence (NCI) during enterprise contract review and vendor evaluation.
The standards support:
• security and privacy risk evaluation
• compliance gap identification
• operational accountability assessment
• governance consistency
• AI-assisted contract analysis workflows
This document should be interpreted alongside:
• Enterprise Risk Taxonomy
• Contract Review & Negotiation Playbook
• Contract Review Checklist & Standards
• Approved Clause Guidance

Security & Compliance Philosophy
NCI expects contracts involving enterprise systems, customer information, regulated data, cloud services, or AI-enabled capabilities to maintain appropriate security, privacy, governance, and operational accountability.
Security and compliance obligations should:
• remain reasonably measurable
• support operational enforceability
• align with business criticality
• scale with data sensitivity and operational dependency
• provide clear accountability between parties

Risk-Based Evaluation
Security and compliance obligations should be evaluated proportionate to:
• data sensitivity
• operational dependency
• customer impact
• regulatory exposure
• service criticality
• AI/data usage scope
• cross-border processing considerations
Higher-risk services generally warrant stronger governance, accountability, auditability, and operational controls.

General Security Expectations
Contracts involving enterprise systems or customer information should reasonably define or address:
• information security responsibilities
• access control expectations
• incident response obligations
• confidentiality protections
• data handling requirements
• operational accountability
• vendor oversight
• security cooperation obligations

Security Governance Standards
Generally Required
• defined security responsibilities
• reasonable security controls
• confidentiality obligations
• incident notification obligations
• access management expectations
• subcontractor accountability
• compliance with applicable law

Recommended
• documented security governance process
• periodic security review rights
• security reporting obligations
• operational resilience expectations
• vulnerability management cooperation
• disaster recovery commitments

Elevated Review
• undefined security accountability
• vague security commitments
• absence of incident obligations
• unrestricted subcontractor usage
• unclear operational ownership
• weak governance oversight

Data Protection Standards
Generally Required
• defined data usage scope
• confidentiality protections
• processing purpose limitations
• retention and deletion obligations
• cross-border transfer treatment
• breach notification obligations
• subprocessor transparency

Recommended
• encryption expectations
• access logging expectations
• customer notification cooperation
• privacy audit rights
• defined data segregation expectations
• data minimization practices

Elevated Review
• unrestricted data usage rights
• undefined processing limitations
• unclear retention obligations
• vague international transfer protections
• unrestricted AI model training rights
• insufficient customer data protections

Incident Response Expectations
Contracts involving operational systems or sensitive data should generally define:
• security incident notification obligations
• escalation expectations
• cooperation responsibilities
• remediation coordination
• investigation support expectations

Elevated Review
• undefined breach notification timelines
• unclear incident ownership
• absence of customer notification cooperation
• undefined remediation responsibilities
• lack of accountability for subprocessors

Access Control Standards
Generally Required
• role-based access expectations
• least-privilege principles
• authentication responsibilities
• privileged access accountability
• access revocation expectations

Recommended
• periodic access review expectations
• multi-factor authentication expectations
• administrative activity monitoring
• privileged access logging

Elevated Review
• shared credential practices
• undefined access restrictions
• weak privileged access governance
• lack of authentication accountability

Operational Resilience Standards
Generally Required
• operational continuity responsibilities
• reasonable service restoration expectations
• dependency accountability
• communication responsibilities during disruption

Recommended
• disaster recovery expectations
• business continuity coordination
• resilience testing expectations
• operational reporting obligations

Elevated Review
• undefined continuity obligations
• absence of recovery expectations
• excessive dependency concentration
• vague outage communication obligations

Auditability & Compliance Standards
Generally Required
• reasonable auditability
• cooperation with applicable compliance obligations
• accountability for subcontractors
• maintenance of required records where applicable

Recommended
• compliance reporting obligations
• independent assessment rights
• periodic governance review
• notification of material compliance issues

Elevated Review
• absence of audit rights
• vague regulatory accountability
• undisclosed subcontracting
• inability to validate operational controls

AI Governance Standards
Contracts involving AI-enabled services, automated decision support, model training, or AI-assisted processing should reasonably address:
• permitted AI usage scope
• customer data usage limitations
• accountability for AI-enabled outputs
• transparency of AI-assisted functionality
• protection of customer information
• governance over training data usage

Recommended
• human review expectations for material decisions
• explainability support where appropriate
• model governance accountability
• AI usage disclosure obligations
• restrictions on unauthorized training usage

Elevated Review
• unrestricted AI model training rights
• undefined AI accountability
• undisclosed AI-assisted processing
• vague ownership of AI-generated outputs
• absence of governance over customer data usage

Vendor Oversight Standards
Where subcontractors, vendors, or service providers support contractual obligations, agreements should reasonably define:
• subcontractor accountability
• oversight responsibilities
• security inheritance expectations
• compliance responsibilities
• notification obligations for material changes

Elevated Review
• unidentified subcontractors
• unrestricted outsourcing rights
• unclear oversight obligations
• undefined responsibility allocation

Security Gap Types
Complete Gap
A required security or compliance protection is absent.
Example
No incident notification obligation.

Security Gap Types
Complete Gap
A required security, privacy, compliance, governance, or operational protection is entirely absent from the agreement.
Examples:
• no incident notification obligation
• no audit rights
• no confidentiality protections
• no subprocessor disclosure obligations
• no AI governance provisions

Security & Compliance Risk Indicators
Where contractual protections exist but are weak, ambiguous, incomplete, commercially imbalanced, operationally unclear, or insufficiently enforceable, findings should generally be classified as Risks rather than Gaps.
Examples:
• incident notification obligations exist but no notification timeline is defined
• security obligations are generic and lack measurable accountability
• audit rights exist but are heavily operationally restricted
• AI governance provisions permit broad unrestricted model training
• retention obligations exist but deletion timelines remain ambiguous

Cross-Clause Security Validation
Review should identify inconsistencies affecting:
• confidentiality obligations
• data ownership treatment
• incident accountability
• subcontractor governance
• operational responsibilities
• auditability
• AI/data usage permissions
Cross-clause inconsistencies may create elevated operational, compliance, or security exposure even where individual clauses appear acceptable.

Compensating Controls
Where preferred protections cannot be obtained, alternative controls may partially reduce exposure.
Examples include:
• enhanced audit rights
• additional reporting obligations
• operational monitoring
• customer approval requirements
• governance committees
• enhanced notification obligations
• stronger liability protections
Compensating controls should reduce, but not eliminate, elevated review attention.

Security & Compliance Review Outputs
Review may produce:
• Security Concern
• Compliance Concern
• Weak Protection
• Missing Protection
• Operational Dependency
• Governance Concern
• Clarification Needed
• Recommendation
• Negotiation Opportunity

AI-Assisted Review Guidance
AI-assisted review may support:
• security obligation analysis
• compliance gap identification
• operational accountability review
• AI governance assessment
• cross-clause consistency validation
• subcontractor governance review
• recommendation generation
• prioritization of elevated review areas
AI-generated findings should remain traceable to:
• contractual language
• governance standards
• operational expectations
• approved contractual guidance

Security Review Interpretation
Security and compliance standards should be interpreted using a contextual and risk-based approach.
The absence of a specific control does not automatically indicate unacceptable risk.
Likewise, the presence of a contractual protection does not guarantee operational sufficiency.
Review should consider:
• business context
• operational dependency
• data sensitivity
• agreement scope
• compensating controls
• overall contractual accountability

AI Governance Escalation
Elevated review attention may be appropriate where agreements involve:
• autonomous decision-making
• unrestricted model training rights
• sensitive customer data usage
• opaque AI-assisted processing
• undefined accountability for AI-generated outputs

Human Review Requirement
Technology-assisted review improves operational consistency and governance efficiency; however, material security, privacy, compliance, legal, operational, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.security_compliance_standards,
      status: "enterprise_ready",
      ingestReady: false,
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
