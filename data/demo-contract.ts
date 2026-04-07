import type { ContractAnalysis } from "@/types/contract";
import { applyDecisionLogic } from "@/lib/ai/decision";
import { ContractAnalysisSchema } from "@/schemas/contract-analysis";

export const demoContractText = `Master Services Agreement between Northstar Retail Group and Apex Data Systems.

Section 4.2 Payment Terms. Customer shall pay all invoices within 10 calendar days. Any disputed invoice must be paid in full before a dispute is reviewed. Late payments accrue interest at 2.5% per month and Supplier may suspend services immediately without notice.

Section 7.1 Limitation of Liability. Customer's liability is unlimited for payment obligations, data usage, confidentiality, indirect losses, and any claim arising from business interruption. Supplier's aggregate liability shall not exceed fees paid in the previous 30 days.

Section 9.3 Service Levels. Supplier will use commercially reasonable efforts to maintain platform availability but service credits are the sole remedy and are capped at 3% of monthly fees. Planned maintenance may occur at any time.

Section 11.2 Data Protection. Supplier may process Customer Data using subcontractors in any jurisdiction. Supplier will use reasonable safeguards but does not commit to specific security controls, audit rights, incident timelines, or data deletion windows.

Section 13.4 Termination. Supplier may terminate for convenience on 15 days' notice. Customer may terminate only after a material breach remains uncured for 90 days.

Section 18.6 Change Requests. Supplier may adjust implementation timelines and fees for scope changes, dependency delays, or resourcing constraints.`;

export const demoAnalysis: ContractAnalysis = applyDecisionLogic(ContractAnalysisSchema.parse({
  contractTitle: "Northstar Retail Group / Apex Data Systems MSA",
  executiveSummary:
    "The agreement presents a high-risk profile for the customer because financial remedies, data protection obligations, liability allocation, and termination rights are materially one-sided. The recommended position is to renegotiate before signature, focusing first on uncapped customer liability, weak supplier liability, payment suspension rights, and missing data-security commitments.",
  overallRiskLevel: "High",
  decisionRecommendation: "Renegotiate",
  decisionRationale:
    "The contract has multiple high-severity issues, but most are mitigable through liability caps, clearer operational commitments, cure periods, and data protection controls.",
  riskSummary: {
    total: 6,
    high: 3,
    medium: 3,
    low: 0,
    byCategory: {
      Legal: 2,
      Financial: 2,
      Operational: 1,
      Compliance: 1,
      Technical: 0
    }
  },
  topCriticalRisks: [
    "Uncapped customer liability with narrow supplier cap",
    "Immediate suspension for disputed invoices",
    "Weak data protection and subcontractor controls"
  ],
  nextActions: [
    "Renegotiate liability so both parties have proportionate, mutual caps and carve-outs.",
    "Add invoice dispute rights, notice periods, and suspension cure windows.",
    "Require security controls, breach notification timelines, audit rights, and deletion obligations.",
    "Align termination rights and service-level remedies to business continuity needs."
  ],
  risks: [
    {
      id: "RISK-1",
      title: "Uncapped customer liability with narrow supplier cap",
      category: "Legal",
      severity: "High",
      clauseRef: "Section 7.1",
      clauseText:
        "Customer's liability is unlimited for payment obligations, data usage, confidentiality, indirect losses, and any claim arising from business interruption. Supplier's aggregate liability shall not exceed fees paid in the previous 30 days.",
      highlightedText: "Customer's liability is unlimited... Supplier's aggregate liability shall not exceed fees paid in the previous 30 days.",
      mitigability: "High",
      confidence: 0.94,
      whyRisky:
        "The clause creates asymmetric liability: the customer carries broad uncapped exposure while the supplier is protected by an extremely low cap.",
      impactIfIgnored:
        "A dispute, outage, or confidentiality incident could create material financial exposure that is not balanced by supplier accountability.",
      suggestedImprovement:
        "Make liability caps mutual, set the general cap at 12 months of fees, and reserve narrow uncapped carve-outs only for fraud, willful misconduct, and confidentiality breaches."
    },
    {
      id: "RISK-2",
      title: "Immediate suspension for disputed invoices",
      category: "Financial",
      severity: "High",
      clauseRef: "Section 4.2",
      clauseText:
        "Any disputed invoice must be paid in full before a dispute is reviewed. Late payments accrue interest at 2.5% per month and Supplier may suspend services immediately without notice.",
      highlightedText: "Supplier may suspend services immediately without notice.",
      mitigability: "High",
      confidence: 0.91,
      whyRisky:
        "The customer must pay disputed amounts before review and faces immediate service suspension without notice or cure rights.",
      impactIfIgnored:
        "A billing disagreement could disrupt critical operations and weaken the customer's negotiation position.",
      suggestedImprovement:
        "Allow good-faith invoice disputes, require payment of undisputed amounts only, add at least 10 business days' notice, and prohibit suspension while disputes are being resolved."
    },
    {
      id: "RISK-3",
      title: "Weak data protection commitments",
      category: "Compliance",
      severity: "High",
      clauseRef: "Section 11.2",
      clauseText:
        "Supplier may process Customer Data using subcontractors in any jurisdiction. Supplier will use reasonable safeguards but does not commit to specific security controls, audit rights, incident timelines, or data deletion windows.",
      highlightedText: "does not commit to specific security controls, audit rights, incident timelines, or data deletion windows",
      mitigability: "Medium",
      confidence: 0.89,
      whyRisky:
        "The clause lacks operationally testable privacy and security obligations for subcontractors, cross-border processing, incidents, audits, and deletion.",
      impactIfIgnored:
        "The customer may be exposed to regulatory, contractual, and reputational risk if supplier data handling fails.",
      suggestedImprovement:
        "Attach a data processing addendum with approved subprocessors, security controls, 48-hour incident notice, audit rights, transfer safeguards, and deletion or return timelines."
    },
    {
      id: "RISK-4",
      title: "Service level remedy is too limited",
      category: "Operational",
      severity: "Medium",
      clauseRef: "Section 9.3",
      clauseText:
        "Supplier will use commercially reasonable efforts to maintain platform availability but service credits are the sole remedy and are capped at 3% of monthly fees. Planned maintenance may occur at any time.",
      highlightedText: "service credits are the sole remedy and are capped at 3% of monthly fees",
      mitigability: "Medium",
      confidence: 0.86,
      whyRisky:
        "The supplier's uptime obligation is vague, and the sole remedy may be too small to incentivize performance or compensate business disruption.",
      impactIfIgnored:
        "Recurring outages may have no meaningful contractual remedy beyond minimal credits.",
      suggestedImprovement:
        "Define measurable uptime targets, notice windows for maintenance, root-cause reporting, escalation rights, and termination rights for repeated SLA failures."
    },
    {
      id: "RISK-5",
      title: "One-sided termination rights",
      category: "Legal",
      severity: "Medium",
      clauseRef: "Section 13.4",
      clauseText:
        "Supplier may terminate for convenience on 15 days' notice. Customer may terminate only after a material breach remains uncured for 90 days.",
      highlightedText: "Supplier may terminate for convenience on 15 days' notice",
      mitigability: "High",
      confidence: 0.88,
      whyRisky:
        "The supplier can exit quickly while the customer has a long cure period and no comparable convenience termination right.",
      impactIfIgnored:
        "The customer could lose service continuity with little transition time and limited leverage.",
      suggestedImprovement:
        "Make termination rights mutual, add transition assistance, require at least 60 days' notice for convenience termination, and shorten the customer breach cure period to 30 days."
    },
    {
      id: "RISK-6",
      title: "Open-ended change request fees",
      category: "Financial",
      severity: "Medium",
      clauseRef: "Section 18.6",
      clauseText:
        "Supplier may adjust implementation timelines and fees for scope changes, dependency delays, or resourcing constraints.",
      highlightedText: "may adjust implementation timelines and fees",
      mitigability: "Medium",
      confidence: 0.84,
      whyRisky:
        "The supplier can change fees and timelines for broad reasons without a defined change-control approval process.",
      impactIfIgnored:
        "Implementation costs may expand materially and timelines may slip without customer approval gates.",
      suggestedImprovement:
        "Require written change orders, customer approval, documented assumptions, capped pass-through costs, and impact analysis before timeline or fee changes take effect."
    }
  ]
}));
