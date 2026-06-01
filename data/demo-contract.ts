import type { ContractAnalysis } from "@/types/contract";
import { applyDecisionLogic } from "@/lib/ai/decision";
import { ContractAnalysisSchema } from "@/schemas/contract-analysis";

export const demoDocumentTitle = "Website Design and Digital Services Agreement";

export const demoContractText = `DEMO CONTRACT AGREEMENT
Website Design and Digital Services Agreement

1. Parties Involved and Contact Information

This Agreement is entered into on January 15, 2026, between:

Service Provider:
Bright Digital Design LLC
123 Main Street, Chicago, IL 60601
Email: hello@brightdigital.com
Phone: (312) 555-0123

Client:
Metro Coffee Roasters Inc.
456 Oak Avenue, Chicago, IL 60602
Email: maria@metrocoffee.com
Phone: (312) 555-0456

Authorized Signatory:
Maria Santos, Owner


2. Scope of Work and Deliverables

Bright Digital Design will create a custom five-page website for Metro Coffee Roasters, including:

- Home page with hero image and company overview
- About page with team bios and company history
- Products page with coffee offerings and descriptions
- Contact page with inquiry form and location map
- Blog page with content management system

Exclusions:
This project does not include copywriting, photography, e-commerce functionality, SEO services, or ongoing website maintenance.

The Supplier shall rely on content, approvals, and inputs provided by the Client and third-party vendors. Delays or deficiencies in such inputs may impact delivery timelines and quality, for which the Supplier shall not be held responsible.


3. Project Timeline and Milestones

Week 1: Initial consultation and wireframe approval
Week 2-3: Design mockups and client feedback
Week 4-5: Development and content integration
Week 6: Testing, revisions, and launch

Final delivery target: February 26, 2026.

The Client must provide all content, images, and feedback within three business days of each milestone. Delays in client materials will extend the final delivery date accordingly.

Failure to meet timelines caused by delayed approvals, dependencies, or third-party tools shall not constitute breach of contract.


4. Payment Terms and Schedule

Total project cost: $8,500

Payment schedule:
- $4,250 (50%) due upon signing
- $2,125 (25%) due upon design approval
- $2,125 (25%) due upon completion

Payment is due within 30 days of invoice date.

The Client reserves the right to:
- delay payments pending internal approvals
- withhold payments in case of disputes or performance concerns

Late payments may incur interest at 1.5% per month, subject to Client approval.

Accepted methods:
Bank transfer, check, or credit card (3% fee).


5. Termination and Cancellation Policy

Either party may terminate this Agreement with 14 days written notice.

The Client may terminate immediately for convenience without further payment obligation beyond amounts already approved internally.

If the Client terminates, they will pay for completed work at the Client's sole assessment of completion status.

If Bright Digital Design terminates due to client breach or non-payment, the Client forfeits the deposit and owes payment for completed work.

The Client may withhold pending payments until completion of internal review and acceptance of delivered work.


6. Confidentiality and NDA Terms

Both parties agree to keep confidential any proprietary business information, trade secrets, customer data, and financial information shared during this project.

This obligation continues for three years after project completion.

Exceptions include:
- information already public
- information already known before disclosure
- legally required disclosures

The Client may disclose Supplier-related information to affiliates, advisors, regulators, or business partners where reasonably required.

Breach of confidentiality may result in damages equal to three times the contract value.


7. Intellectual Property Rights

Upon full payment, Bright Digital Design assigns ownership rights in final design files, code, and website assets to Metro Coffee Roasters.

Bright Digital Design retains the right to display completed work in its portfolio and marketing materials.

Bright Digital Design retains ownership of pre-existing code libraries, templates, frameworks, and reusable components.

The Client receives a non-exclusive license to use such elements only as incorporated into the final website.

If this Agreement terminates before full payment, Bright Digital Design retains all intellectual property rights in unfinished work.


8. Liability and Indemnification

Bright Digital Design's aggregate liability is capped at the total contract value of $8,500.

However, Supplier shall also be responsible for:
- third-party claims arising from integrations or deployment
- data-related incidents regardless of source
- regulatory fines linked to project delivery
- remediation costs and customer claims arising from security incidents

Client may audit Supplier systems, records, subcontractors, and security controls at any time without prior notice.

Indemnification:
- Client indemnifies Supplier for issues caused solely by Client-provided materials
- Supplier fully indemnifies Client against claims arising from Supplier work, including IP claims, without monetary cap

Bright Digital Design provides services "as is" and makes no warranties regarding traffic, ranking, or commercial performance unless expressly agreed.


9. Change Order Process and Repricing Terms

Any material change to scope requires a written change order signed by both parties.

Additional work will be billed at:
- $150/hour design
- $125/hour development

Requests after design approval may require repricing or revised timelines.

The Supplier shall not unreasonably refuse reasonable change requests.

The Client may modify requirements, priorities, or delivery expectations during the project lifecycle, and Supplier shall use reasonable efforts to accommodate such changes promptly.


10. Communication Protocols and Response Times

Primary communication channel: Email

Business hours:
Monday-Friday, 9:00 AM - 5:00 PM Central Time

Response expectations:
- Supplier: within 24-48 hours
- Client: within 3 business days

Routine scheduling delays shall not be considered breach.


11. Data Ownership, Portability, and Post-Termination Access

Metro Coffee Roasters owns all approved business content and final deliverables upon full payment.

Bright Digital Design will provide final website files upon completion.

If hosted temporarily by Supplier, Client must migrate within 30 days.

Supplier may delete hosted files, backups, logs, and stored content after that period without further notice.


12. Technology and Third-Party Dependencies

The website may rely on third-party platforms, APIs, plugins, hosting providers, analytics tools, or infrastructure services.

Bright Digital Design shall not be responsible for service interruptions, performance issues, vulnerabilities, or data loss caused by such dependencies unless directly caused by Supplier negligence.


13. Data Processing and Cross-Border Transfers

Client data may be stored or processed across jurisdictions, including regions without equivalent data protection regulations.

The Supplier shall implement reasonable safeguards but remains responsible for breaches, compliance failures, fines, claims, and remediation costs arising from processing activities.


14. Service Levels and Performance

The Supplier shall use reasonable efforts to meet agreed expectations.

Failure to meet performance expectations shall not automatically result in penalties, service credits, or compensation unless expressly agreed in writing.

Support obligations for hosting or maintenance services, if later purchased, shall automatically renew annually unless cancelled at least 90 days before renewal.


15. No Guarantee of Business Outcomes

Bright Digital Design does not guarantee website traffic, engagement, leads, conversions, or revenue outcomes.

All services are provided on a best-effort basis.


16. Dispute Resolution and Governing Law

Any disputes shall be resolved through arbitration in Cook County, Illinois.

This Agreement is governed by the laws of the State of Illinois, USA.

For international engagements, applicable local regulations may also apply.`;

function buildDemoGapEnhancement({
  clauseName,
  category,
  aiConfidence,
  recommendedClause
}: {
  clauseName: string;
  category: string;
  aiConfidence: number;
  recommendedClause: string;
}) {
  return {
    category,
    aiConfidence,
    status: "Pending" as const,
    recommendedClause,
    clauseVariants: {
      balanced: `${recommendedClause}\n\nFor clarity, the parties will apply this clause in a commercially reasonable manner and will cooperate in good faith to resolve implementation issues related to ${clauseName.toLowerCase()}.`,
      detailed: `${recommendedClause}\n\nThe parties will document responsible owners, approval steps, response timelines, evidence requirements, and escalation contacts for this obligation before the relevant workstream begins.`,
      alternative: `The parties will agree on practical controls for ${clauseName.toLowerCase()} before launch or continued performance. Those controls must identify required notices, responsible parties, timing expectations, and any limits on costs, access, or liability.`,
      protective: `${recommendedClause}\n\nSupplier will not be responsible for delays, incidents, costs, or failures caused by Client-controlled systems, delayed Client approvals, third-party services selected by Client, or instructions outside the agreed statement of work.`
    }
  };
}

export const demoAnalysis: ContractAnalysis = applyDecisionLogic(ContractAnalysisSchema.parse({
  contractTitle: demoDocumentTitle,
  executiveSummary:
    "The agreement presents a high-risk profile because payment rights, termination economics, uncapped supplier indemnities, audit rights, and data obligations are materially broad or internally inconsistent. The recommended position is to renegotiate before signature, focusing first on payment certainty, liability allocation, audit scope, and post-termination data handling.",
  aiInsight:
    "The primary exposure is concentrated in discretionary payment withholding, uncapped supplier indemnities, broad audit rights, and ambiguous data-processing responsibility.",
  overallRiskLevel: "High",
  decisionRecommendation: "Renegotiate",
  decisionRationale:
    "The contract includes several high-severity commercial and operational exposures that should be narrowed before approval.",
  riskSummary: {
    total: 8,
    high: 4,
    medium: 4,
    low: 0,
    byCategory: {
      Legal: 2,
      Financial: 2,
      Operational: 2,
      Compliance: 1,
      Technical: 1
    }
  },
  topCriticalRisks: [
    "Client can delay or withhold payment for broad internal reasons",
    "Supplier indemnity is uncapped despite a stated liability cap",
    "Client audit rights are broad and lack notice limits"
  ],
  nextActions: [
    "Clarify objective payment acceptance criteria and dispute procedures.",
    "Align liability, indemnity, and data incident responsibility with a defined monetary cap and narrow carve-outs.",
    "Limit audit rights to reasonable notice, defined scope, confidentiality safeguards, and security-sensitive boundaries.",
    "Add transition, data return, backup retention, and deletion notice obligations."
  ],
  gapAnalysis: [
    {
      id: "GAP-1",
      clauseName: "Data Security and Incident Notification Clause",
      action: "Must Add",
      impact: "High",
      whyThisMatters:
        "The agreement creates broad supplier responsibility for data incidents but does not define specific security controls, breach notification timelines, or incident response obligations.",
      suggestedFix:
        "Add a clause defining minimum security controls, incident notification timelines, cooperation duties, and responsibility boundaries for data-related incidents.",
      ...buildDemoGapEnhancement({
        clauseName: "Data Security and Incident Notification Clause",
        category: "Compliance",
        aiConfidence: 94,
        recommendedClause:
          "Supplier will maintain commercially reasonable administrative, technical, and organizational safeguards appropriate to the services and data handled. Each party must notify the other without undue delay after discovering a confirmed security incident affecting Client data, cooperate in good faith on investigation and remediation, and allocate incident responsibility according to the party whose systems, personnel, instructions, or third-party services caused the incident."
      })
    },
    {
      id: "GAP-2",
      clauseName: "Acceptance Criteria and Deemed Acceptance Clause",
      action: "Must Add",
      impact: "Medium",
      whyThisMatters:
        "The contract allows the client to withhold payment pending internal review, but it does not define objective acceptance criteria or a deemed acceptance timeline.",
      suggestedFix:
        "Add objective acceptance criteria, review timelines, and deemed acceptance if the client does not reject deliverables with specific reasons within an agreed period.",
      ...buildDemoGapEnhancement({
        clauseName: "Acceptance Criteria and Deemed Acceptance Clause",
        category: "Financial",
        aiConfidence: 92,
        recommendedClause:
          "Deliverables will be reviewed against the written scope, approved specifications, and mutually agreed acceptance criteria. Client must either accept a deliverable or provide a written rejection describing specific nonconformities within ten business days after delivery. If Client does not provide a timely written rejection, the deliverable will be deemed accepted and any undisputed related invoice amounts will become payable."
      })
    },
    {
      id: "GAP-3",
      clauseName: "Audit Scope and Notice Procedure",
      action: "Must Add",
      impact: "High",
      whyThisMatters:
        "The client may audit supplier systems, records, subcontractors, and controls at any time without prior notice, but the agreement does not define reasonable limits or procedures.",
      suggestedFix:
        "Add audit notice requirements, frequency limits, confidentiality protections, scope boundaries, and rules for audits of subcontractors or security controls.",
      ...buildDemoGapEnhancement({
        clauseName: "Audit Scope and Notice Procedure",
        category: "Compliance",
        aiConfidence: 93,
        recommendedClause:
          "Client may conduct audits only on at least ten business days' prior written notice, during normal business hours, no more than once per calendar year unless required by a confirmed material incident. Audits must be limited to records and controls directly relevant to the services, conducted under confidentiality obligations, and performed in a manner that does not unreasonably disrupt Supplier operations or compromise security-sensitive information."
      })
    },
    {
      id: "GAP-4",
      clauseName: "Client Dependency and Delay Protection Clause",
      action: "Negotiate",
      impact: "Medium",
      whyThisMatters:
        "The agreement mentions client delays but does not fully protect the supplier from cost, resourcing, or schedule impacts caused by late approvals, content, or third-party inputs.",
      suggestedFix:
        "Add language confirming that client-caused delays extend timelines, may require repricing, and relieve the supplier from responsibility for affected milestones.",
      ...buildDemoGapEnhancement({
        clauseName: "Client Dependency and Delay Protection Clause",
        category: "Operational",
        aiConfidence: 88,
        recommendedClause:
          "Supplier timelines and milestones will be extended to the extent delays are caused by Client approvals, content, access credentials, feedback, third-party inputs, or decisions. Supplier will not be responsible for missed milestones caused by those dependencies, and material delay or rework caused by Client-controlled items may require a written change order for additional fees, resourcing, or schedule adjustments."
      })
    },
    {
      id: "GAP-5",
      clauseName: "Third-Party Tools Responsibility Matrix",
      action: "Negotiate",
      impact: "High",
      whyThisMatters:
        "The website may rely on plugins, APIs, hosting, analytics, or infrastructure services, but responsibilities for selection, licensing, security, outages, and costs are not clearly allocated.",
      suggestedFix:
        "Add a responsibility matrix clarifying ownership of third-party tools, licensing costs, security obligations, outage responsibility, and approval requirements.",
      ...buildDemoGapEnhancement({
        clauseName: "Third-Party Tools Responsibility Matrix",
        category: "Technical",
        aiConfidence: 90,
        recommendedClause:
          "The parties will maintain a responsibility matrix for third-party tools, plugins, APIs, hosting, analytics, and infrastructure services used in the project. The matrix must identify who selects, approves, licenses, pays for, administers, monitors, and secures each service, and must state that Supplier is not responsible for outages, vulnerabilities, price changes, or policy changes in third-party services outside Supplier's control."
      })
    },
    {
      id: "GAP-6",
      clauseName: "Post-Termination Transition Assistance Clause",
      action: "Optional",
      impact: "Low",
      whyThisMatters:
        "The agreement states that hosted files may be deleted after 30 days, but it does not clearly define any transition support, handover process, or assistance fees.",
      suggestedFix:
        "Add optional transition assistance terms covering handover support, export format, timelines, fees, and responsibilities after termination or project completion.",
      ...buildDemoGapEnhancement({
        clauseName: "Post-Termination Transition Assistance Clause",
        category: "Operational",
        aiConfidence: 84,
        recommendedClause:
          "Upon termination or project completion, Supplier will provide reasonable transition assistance upon Client's written request, including export of project files in Supplier's standard format and reasonable handover support. Any transition assistance beyond included deliverables will be billed at Supplier's then-current rates unless otherwise agreed in writing."
      })
    },
    {
      id: "GAP-7",
      clauseName: "Data Retention and Deletion Procedure",
      action: "Must Add",
      impact: "Medium",
      whyThisMatters:
        "The agreement allows supplier-hosted files and stored content to be deleted after 30 days, but it does not define a clear retention, backup, or deletion procedure.",
      suggestedFix:
        "Add a data retention and deletion clause covering notice, backup handling, retention period, deletion confirmation, and recovery responsibilities.",
      ...buildDemoGapEnhancement({
        clauseName: "Data Retention and Deletion Procedure",
        category: "Technical",
        aiConfidence: 87,
        recommendedClause:
          "Supplier will retain hosted project files and stored content for thirty days after termination or completion unless a longer period is agreed in writing. Before deletion, Supplier will provide reasonable written notice and an opportunity for Client to request export assistance. Backup availability, deletion confirmation, and recovery obligations will be limited to Supplier-controlled systems and documented retention procedures."
      })
    },
    {
      id: "GAP-8",
      clauseName: "Subcontractor Approval and Responsibility Clause",
      action: "Negotiate",
      impact: "Medium",
      whyThisMatters:
        "The agreement permits reliance on third-party tools and vendors but does not clearly define subcontractor approval, oversight, or responsibility for subcontracted work.",
      suggestedFix:
        "Add subcontractor approval requirements, responsibility for subcontractor acts, and restrictions on sharing confidential or client data with subcontractors.",
      ...buildDemoGapEnhancement({
        clauseName: "Subcontractor Approval and Responsibility Clause",
        category: "Legal",
        aiConfidence: 86,
        recommendedClause:
          "Supplier may use subcontractors or specialized vendors to perform portions of the services, provided Supplier remains responsible for subcontracted work within the agreed scope. Supplier will not share Client confidential information or Client data with subcontractors except as reasonably necessary for the services and subject to confidentiality, security, and use restrictions consistent with this agreement."
      })
    },
    {
      id: "GAP-9",
      clauseName: "Warranty Period for Defects",
      action: "Negotiate",
      impact: "Medium",
      whyThisMatters:
        "The agreement includes testing and launch activities but does not define a post-launch defect correction period for issues arising from delivered work.",
      suggestedFix:
        "Add a limited warranty period requiring correction of defects caused by supplier work within an agreed timeframe after launch.",
      ...buildDemoGapEnhancement({
        clauseName: "Warranty Period for Defects",
        category: "Operational",
        aiConfidence: 85,
        recommendedClause:
          "For thirty days after launch, Supplier will correct reproducible defects in the delivered work that materially deviate from the approved specifications and are caused by Supplier's work. This warranty excludes issues caused by Client changes, third-party services, misuse, unsupported environments, or work performed outside the agreed scope."
      })
    },
    {
      id: "GAP-10",
      clauseName: "Portfolio Use Approval Process",
      action: "Optional",
      impact: "Low",
      whyThisMatters:
        "The supplier may display completed work in its portfolio and marketing materials, but the agreement does not define approval rights or confidentiality limits.",
      suggestedFix:
        "Add a portfolio use approval process requiring client consent before using logos, screenshots, business names, or confidential project details.",
      ...buildDemoGapEnhancement({
        clauseName: "Portfolio Use Approval Process",
        category: "Legal",
        aiConfidence: 78,
        recommendedClause:
          "Supplier may reference the completed project in its portfolio only after obtaining Client's prior written approval for use of Client name, logos, screenshots, or public descriptions. Supplier may not disclose confidential information, non-public business details, credentials, analytics, or security-sensitive materials in any portfolio or marketing use."
      })
    }
  ],
  risks: [
    {
      id: "RISK-1",
      title: "Client can delay or withhold payment for broad internal reasons",
      category: "Financial",
      severity: "High",
      clauseRef: "Section 4",
      clauseText:
        "The Client reserves the right to delay payments pending internal approvals and withhold payments in case of disputes or performance concerns. Late payments may incur interest at 1.5% per month, subject to Client approval.",
      highlightedText: "delay payments pending internal approvals... withhold payments in case of disputes or performance concerns",
      mitigability: "High",
      confidence: 0.94,
      whyRisky:
        "Payment can be delayed or withheld based on broad internal approvals and undefined performance concerns, while late-payment interest also depends on client approval.",
      impactIfIgnored:
        "The service provider may carry project costs without predictable cash collection or meaningful late-payment protection.",
      suggestedImprovement:
        "Require payment of undisputed amounts within 30 days, define a good-faith dispute process, and apply late fees automatically to overdue undisputed invoices."
    },
    {
      id: "RISK-2",
      title: "Termination economics depend on client's sole assessment",
      category: "Financial",
      severity: "High",
      clauseRef: "Section 5",
      clauseText:
        "The Client may terminate immediately for convenience without further payment obligation beyond amounts already approved internally. If the Client terminates, they will pay for completed work at the Client's sole assessment of completion status.",
      highlightedText: "without further payment obligation beyond amounts already approved internally... Client's sole assessment",
      mitigability: "High",
      confidence: 0.91,
      whyRisky:
        "The client can terminate for convenience and unilaterally determine how much completed work is payable.",
      impactIfIgnored:
        "A near-complete project could be cancelled with limited recovery for work performed, committed resources, or non-cancellable costs.",
      suggestedImprovement:
        "Require payment for all work performed through the termination date, approved expenses, and a defined percentage of committed work in progress."
    },
    {
      id: "RISK-3",
      title: "Supplier indemnity is uncapped despite a stated liability cap",
      category: "Legal",
      severity: "High",
      clauseRef: "Section 8",
      clauseText:
        "Bright Digital Design's aggregate liability is capped at the total contract value of $8,500. Supplier fully indemnifies Client against claims arising from Supplier work, including IP claims, without monetary cap.",
      highlightedText: "fully indemnifies Client against claims arising from Supplier work, including IP claims, without monetary cap",
      mitigability: "Medium",
      confidence: 0.93,
      whyRisky:
        "The liability cap is undermined by broad uncapped indemnity obligations for supplier work and IP claims.",
      impactIfIgnored:
        "Supplier exposure could exceed the contract value and become disproportionate to the project fee.",
      suggestedImprovement:
        "Make indemnity obligations subject to the liability cap except for narrow carve-outs such as willful misconduct or proven third-party IP infringement."
    },
    {
      id: "RISK-4",
      title: "Audit rights are broad and lack notice limits",
      category: "Compliance",
      severity: "High",
      clauseRef: "Section 8",
      clauseText:
        "Client may audit Supplier systems, records, subcontractors, and security controls at any time without prior notice.",
      highlightedText: "at any time without prior notice",
      mitigability: "High",
      confidence: 0.9,
      whyRisky:
        "Unannounced audit rights over systems, records, subcontractors, and security controls are operationally disruptive and may create confidentiality or security concerns.",
      impactIfIgnored:
        "The supplier may face intrusive reviews, subcontractor friction, and exposure of sensitive operational information.",
      suggestedImprovement:
        "Limit audits to reasonable business hours, prior written notice, defined scope, confidentiality controls, and no more than once annually unless a material incident occurs."
    },
    {
      id: "RISK-5",
      title: "Data processing responsibilities are broad and internally inconsistent",
      category: "Legal",
      severity: "Medium",
      clauseRef: "Sections 8 and 13",
      clauseText:
        "Supplier shall also be responsible for data-related incidents regardless of source. Client data may be stored or processed across jurisdictions, including regions without equivalent data protection regulations.",
      highlightedText: "responsible for data-related incidents regardless of source",
      mitigability: "Medium",
      confidence: 0.88,
      whyRisky:
        "The supplier is responsible for data-related incidents regardless of source while cross-border processing may involve jurisdictions with weaker protections.",
      impactIfIgnored:
        "The parties may dispute responsibility for breaches, fines, remediation, and claims caused by third-party systems or client-controlled data decisions.",
      suggestedImprovement:
        "Tie responsibility to each party's control, require documented safeguards, define approved processing locations, and allocate breach costs based on fault."
    },
    {
      id: "RISK-6",
      title: "Change request obligations conflict with written change-order controls",
      category: "Operational",
      severity: "Medium",
      clauseRef: "Section 9",
      clauseText:
        "Any material change to scope requires a written change order signed by both parties. The Client may modify requirements, priorities, or delivery expectations during the project lifecycle, and Supplier shall use reasonable efforts to accommodate such changes promptly.",
      highlightedText: "Client may modify requirements, priorities, or delivery expectations",
      mitigability: "High",
      confidence: 0.86,
      whyRisky:
        "The clause requires signed change orders but also gives the client broad flexibility to modify requirements and delivery expectations.",
      impactIfIgnored:
        "Scope, timeline, and budget disputes may arise if informal requests are treated as required work without pricing approval.",
      suggestedImprovement:
        "State that no scope, priority, or timeline change is binding until documented in an approved change order with pricing and schedule impact."
    },
    {
      id: "RISK-7",
      title: "Hosted files may be deleted after a short migration window",
      category: "Technical",
      severity: "Medium",
      clauseRef: "Section 11",
      clauseText:
        "If hosted temporarily by Supplier, Client must migrate within 30 days. Supplier may delete hosted files, backups, logs, and stored content after that period without further notice.",
      highlightedText: "delete hosted files, backups, logs, and stored content after that period without further notice",
      mitigability: "High",
      confidence: 0.85,
      whyRisky:
        "A short post-termination migration window and deletion without further notice may result in loss of files, logs, or backup content.",
      impactIfIgnored:
        "The client may lose access to website assets or evidence needed for transition, troubleshooting, or compliance.",
      suggestedImprovement:
        "Require written deletion notice, a longer migration period, export assistance, and confirmation of backup retention or destruction."
    },
    {
      id: "RISK-8",
      title: "Future support services auto-renew with long cancellation notice",
      category: "Operational",
      severity: "Medium",
      clauseRef: "Section 14",
      clauseText:
        "Support obligations for hosting or maintenance services, if later purchased, shall automatically renew annually unless cancelled at least 90 days before renewal.",
      highlightedText: "automatically renew annually unless cancelled at least 90 days before renewal",
      mitigability: "High",
      confidence: 0.82,
      whyRisky:
        "Support services not included in the initial scope would automatically renew annually with a long cancellation window if later purchased.",
      impactIfIgnored:
        "The client may become locked into recurring support costs or miss a cancellation deadline.",
      suggestedImprovement:
        "Require a separate support order with pricing, service levels, renewal reminders, and a shorter cancellation period."
    }
  ]
}));
