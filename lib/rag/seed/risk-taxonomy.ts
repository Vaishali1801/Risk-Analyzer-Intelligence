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
    content: `Northstar Cloud Intelligence (NCI) – Enterprise Risk Taxonomy

Purpose
This document establishes the enterprise framework used by Northstar Cloud Intelligence (NCI) to identify, classify, prioritize, normalize, and evaluate contractual risks and governance gaps during contract review.
The taxonomy supports:
• consistent risk classification
• severity normalization
• business impact assessment
• gap identification
• risk aggregation
• negotiation prioritization
• enterprise contract governance processes
This taxonomy may be applied across all enterprise agreements reviewed by NCI.

Risk Domains
Financial Risk
Risks that may create direct or indirect financial exposure, revenue uncertainty, pricing instability, or commercially unfavorable outcomes.
Common examples
• unilateral pricing changes
• unclear payment obligations
• undefined acceptance criteria tied to payment
• excessive service credits
• uncapped financial exposure
• automatic renewals without notice
• unfavorable refund obligations
Typical business impacts
• revenue leakage
• unexpected financial liability
• billing disputes
• margin reduction
• contract profitability risk

Legal Risk
Risks arising from unclear, imbalanced, unenforceable, or commercially unfavorable legal obligations.
Common examples
• unlimited liability
• one-sided indemnification
• vague intellectual property ownership
• broad termination rights
• ambiguous contractual language
• undefined dispute resolution process
• inconsistent contractual obligations
Typical business impacts
• legal disputes
• litigation exposure
• contractual ambiguity
• ownership conflicts
• unfavorable legal precedent

Compliance Risk
Risks related to regulatory obligations, auditability, privacy, governance requirements, or failure to satisfy enterprise compliance expectations.
Common examples
• missing breach notification obligations
• insufficient audit rights
• unclear regulatory responsibilities
• non-compliant data handling obligations
• inadequate retention or deletion commitments
• missing subcontractor disclosure requirements
Typical business impacts
• regulatory penalties
• audit failures
• contractual non-compliance
• governance deficiencies
• reputational damage

Operational Risk
Risks affecting service delivery, execution capability, operational continuity, vendor accountability, or organizational scalability.
Common examples
• undefined support obligations
• unclear project scope
• vague change management governance
• unrealistic delivery commitments
• dependency on unidentified subcontractors
• unclear escalation responsibilities
• undefined service acceptance process
Typical business impacts
• delivery delays
• operational disruption
• vendor dependency
• service instability
• project execution conflicts

Technical / Data Risk
Risks related to information security, cloud operations, platform reliability, AI governance, or protection of enterprise data.
Common examples
• weak security obligations
• inadequate encryption commitments
• weak disaster recovery commitments
• vague uptime commitments
• unrestricted AI training on customer data
• insufficient access control obligations
• undefined security incident response expectations
Typical business impacts
• security incidents
• data exposure
• platform downtime
• erosion of customer trust
• operational instability

Multi-Domain Classification
A contractual finding may belong to multiple risk domains.
Where multiple domains apply:
• assign one Primary Domain representing the dominant business concern
• assign one or more Secondary Domains representing related impacts
Example
Finding: Missing security incident notification obligation
Primary Domain
• Compliance
Secondary Domains
• Technical / Data
• Operational
This approach enables comprehensive reporting while preserving a single primary classification for dashboards and prioritization.

Risk vs Gap
Risk
A contractual provision that exists but introduces enterprise exposure due to weak, ambiguous, incomplete, imbalanced, overly broad, operationally unclear, or commercially unfavorable language.
Risks may arise where contractual protections exist but are insufficiently defined, operationally weak, difficult to enforce, or create disproportionate enterprise exposure.
Examples
• unlimited liability clause
• unilateral pricing change rights
• broad indemnification obligations
• vague breach notification obligations
• incomplete audit rights
• undefined AI training limitations
• ambiguous deletion timelines
• unclear operational accountability language
• aggressive SLA commitments
• weak security obligations

Gap
A contractual protection, governance obligation, operational safeguard, accountability mechanism, or enterprise control that is entirely absent from the agreement, such that no materially equivalent provision exists elsewhere in the contract.
Gap analysis focuses on identifying protections or governance mechanisms expected under enterprise standards that do not appear within the contractual language.
Examples
• missing confidentiality obligations
• absence of audit rights
• no breach notification obligation
• missing deletion rights
• absence of AI governance provisions
• no subprocessor disclosure obligations
• missing transition assistance obligations
• no data portability provisions
• missing liability limitation structure
• absence of ownership definitions

Decision Rule
When evaluating a contractual provision:
• If the protection exists but is weak, ambiguous, incomplete, commercially unfavorable, operationally limited, or insufficiently defined, classify the finding as a Risk.
• If the protection or governance mechanism is entirely absent from the agreement, classify the finding as a Gap.
• The same contractual topic should not ordinarily be reported as both a Risk and a Gap unless the Risk and Gap relate to materially different aspects of that topic.
• Duplicate reporting should be avoided. Where an existing clause gives rise to a Risk, the same contractual obligation should not also be reported as a Gap solely because the clause is incomplete or weak. Gaps should represent protections that are entirely absent.
• Cross-Clause Consideration: A finding may be classified as a Risk rather than a Gap where contractual protections exist elsewhere in the agreement but create ambiguity, inconsistency, operational conflict, or incomplete governance when interpreted together. Example: A contract may contain deletion obligations in one clause while separately permitting indefinite retention of derived datasets. Such issues should generally be treated as Risks arising from conflicting or incomplete governance rather than as missing protections.

Gap Classification
Gap analysis identifies contractual protections, governance obligations, operational safeguards, or enterprise controls that are entirely absent from the agreement and may expose the organization to operational, legal, compliance, financial, security, or governance risk.
Gap analysis focuses on identifying:
• missing governance controls
• absent compliance obligations
• missing operational safeguards
• absent accountability mechanisms
• missing enterprise protections
• omitted contractual obligations
Weak, ambiguous, incomplete, or insufficiently defined contractual language should generally be classified as Risks rather than Gaps.

Gap Priority Levels
Must Add
Critical missing protections creating material enterprise exposure.
Examples
• no breach notification obligation
• missing liability limitation structure
• no confidentiality obligations
• no ownership provisions
• absence of audit rights for critical vendors
• no deletion obligations
• missing security governance provisions

Negotiate
Missing contractual protections or governance provisions that should reasonably be added, clarified, or improved based on business context, operational dependency, or enterprise governance expectations.
Examples
• no AI training opt-out mechanism
• missing transition assistance obligations
• no defined escalation governance process
• absence of data residency commitments
• no customer notification obligations for material subprocessors
• missing portability assistance commitments

Optional
Lower-impact governance enhancements intended to improve operational maturity, reporting visibility, contractual clarity, or enterprise governance consistency.
Examples
• optional governance reporting enhancements
• additional operational transparency provisions
• governance review cadence language
• optional benchmarking rights
• enhanced reporting obligations
• drafting clarifications

Severity Classification
High Severity
Risks or gaps likely to create material:
• financial exposure
• legal exposure
• operational disruption
• security or privacy impact
• regulatory risk
• customer trust impact
Examples
• unlimited liability
• unrestricted data usage rights
• missing breach notification obligations
• broad unilateral termination rights
• absence of confidentiality protections

Medium Severity
Issues creating moderate contractual or operational exposure requiring negotiation or clarification.
Examples
• vague SLA language
• unclear support commitments
• incomplete audit wording
• ambiguous operational obligations
• partially defined ownership terms

Low Severity
Lower-impact drafting issues or governance refinements with limited enterprise exposure.
Examples
• wording inconsistencies
• low-impact ambiguity
• optional governance enhancements
• drafting clarifications

Confidence Interpretation
High Confidence
The contractual language explicitly supports the finding with minimal ambiguity.

Medium Confidence
The finding is reasonably supported but contains language requiring interpretation or clarification.

Low Confidence
The finding is inferred from incomplete, ambiguous, or indirect contractual language and should receive additional human review.

Business Impact Categories
Contract findings may impact one or more enterprise objectives, including:
• revenue protection
• operational continuity
• regulatory compliance
• customer trust
• security and privacy
• intellectual property protection
• service reliability
• vendor accountability
• governance maturity
• scalability and maintainability

Business Criticality
The significance of a finding may vary depending on contract criticality.
High-criticality agreements include:
• strategic technology vendors
• enterprise SaaS platforms
• regulated services
• business-critical infrastructure providers
• contracts involving sensitive customer data
Higher business criticality may justify elevated review attention even where the underlying severity remains unchanged.

Common Enterprise Risk Patterns
Commercial & Financial
• unilateral pricing authority
• undefined payment acceptance conditions
• uncapped credits or refunds
• automatic renewal without notice

Legal & Contractual
• broad indemnification obligations
• unlimited liability exposure
• vague ownership language
• undefined termination consequences

Compliance & Governance
• weak audit rights
• weak privacy obligations
• unclear regulatory responsibilities
• undefined retention or deletion obligations

Operational
• undefined support process
• unclear escalation responsibilities
• unrealistic delivery expectations

Technical & Security
• vague security controls
• weak uptime commitments
• weak disaster recovery obligations
• unrestricted AI or data usage rights

Normalization Principles
Equivalent findings should be represented consistently across agreements.
For example:
• pricing escalation
• fee increase
• commercial price adjustment
may all normalize to:
Pricing Flexibility
to improve reporting consistency and portfolio analytics.

Risk Aggregation Principles
Multiple findings affecting the same contractual obligation should be consolidated into a single enterprise risk where appropriate.
The consolidated finding should:
• preserve all supporting clause references
• retain secondary domain classifications
• assign the highest applicable severity
• combine supporting rationale
• eliminate duplicate reporting

Evidence Grounding Principles
Every identified risk or gap should reference one or more contractual clauses supporting the finding.
Recommendations should be traceable to:
• contractual language
• enterprise governance standards
• approved clause guidance
Findings lacking supporting evidence should be treated as lower confidence and prioritized for additional human review.

Severity vs Priority
Severity
Represents the potential magnitude of enterprise impact if the issue remains unresolved.

Priority
Represents the urgency with which the issue should be reviewed, considering business context, contract criticality, dependencies, negotiation strategy, and organizational objectives.
A medium-severity finding may become a high-priority negotiation item if it affects a strategic or business-critical agreement.

Risk Prioritization Guidance
Findings should be prioritized considering:
• severity
• breadth of business impact
• likelihood of operational disruption
• regulatory exposure
• financial materiality
• customer trust implications
• enforceability concerns
• dependency on unresolved obligations
• business criticality
Higher-priority findings should receive elevated attention during contract negotiation and approval workflows.

Human Review Requirement
Technology-assisted contract analysis improves consistency, efficiency, and governance; however, material legal, commercial, regulatory, security, and strategic decisions remain subject to appropriate human review and organizational approval.`,
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.risk_taxonomy,
      status: "enterprise_ready",
      ingestReady: false,
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
