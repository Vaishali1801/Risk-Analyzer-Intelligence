import type { ContractReviewProfile } from "./types";

export const vendorProfile: ContractReviewProfile = {
  contractType: "Vendor Agreement",
  displayName: "Vendor Agreement",
  description: "Review profile for third-party vendor relationships involving services, operational reliance, compliance, and accountability.",
  profileSignals: {
    strongTitleSignals: [
      "vendor agreement",
      "supplier agreement",
      "vendor services agreement",
      "supplier services agreement",
      "procurement agreement"
    ],
    bodySignals: [
      "purchase order",
      "vendor services",
      "supplier shall",
      "insurance",
      "business continuity",
      "subcontractors",
      "performance reporting",
      "service levels"
    ],
    negativeSignals: [
      "non-disclosure agreement",
      "data processing agreement",
      "software as a service",
      "master services agreement"
    ]
  },
  generallyRequiredClauses: [
    {
      name: "Service levels and deliverables",
      importance: "Generally Required",
      description: "Inspect whether deliverables, service levels, timelines, and acceptance expectations are measurable.",
      domainFocus: ["Operational"]
    },
    {
      name: "Remediation for service failures",
      importance: "Generally Required",
      description: "Inspect whether missed obligations trigger correction, credits, escalation, or other practical remedies.",
      domainFocus: ["Operational", "Financial"]
    },
    {
      name: "Pricing and payment",
      importance: "Generally Required",
      description: "Inspect whether pricing, invoicing, taxes, expenses, pass-through costs, and increases are controlled.",
      domainFocus: ["Financial"]
    },
    {
      name: "Confidentiality",
      importance: "Generally Required",
      description: "Inspect whether vendor access to business, customer, and technical information is protected.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "Operational accountability",
      importance: "Generally Required",
      description: "Inspect whether ownership, staffing, reporting lines, and failure responsibility are clear.",
      domainFocus: ["Operational"]
    },
    {
      name: "Regulatory flow-down obligations",
      importance: "Generally Required",
      description: "Inspect whether applicable laws, customer requirements, and regulated obligations flow to the vendor and its personnel.",
      domainFocus: ["Compliance", "Legal"]
    },
    {
      name: "Termination",
      importance: "Generally Required",
      description: "Inspect whether termination rights, cure periods, wind-down support, and post-termination duties protect continuity.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Liability framework",
      importance: "Generally Required",
      description: "Inspect whether liability caps, exclusions, indemnities, and carveouts reflect vendor risk and service criticality.",
      domainFocus: ["Legal", "Financial"]
    },
    {
      name: "Subcontractor disclosure and approval",
      importance: "Generally Required",
      description: "Inspect whether subcontractors require disclosure, approval or notice, flow-down duties, and vendor responsibility.",
      domainFocus: ["Operational", "Compliance"]
    }
  ],
  recommendedClauses: [
    {
      name: "Audit rights",
      importance: "Recommended",
      description: "Inspect whether audit, inspection, evidence, and remediation rights support vendor oversight.",
      domainFocus: ["Compliance"]
    },
    {
      name: "Insurance",
      importance: "Recommended",
      description: "Inspect whether coverage types, limits, certificates, and notice duties match operational and liability exposure.",
      domainFocus: ["Legal", "Financial"]
    },
    {
      name: "Performance reporting",
      importance: "Recommended",
      description: "Inspect whether recurring reporting, metrics, service reviews, and issue tracking are required.",
      domainFocus: ["Operational"]
    },
    {
      name: "Business continuity",
      importance: "Recommended",
      description: "Inspect whether continuity plans, recovery expectations, testing, and outage communication are required.",
      domainFocus: ["Operational", "Technical"]
    },
    {
      name: "Escalation and governance",
      importance: "Recommended",
      description: "Inspect whether governance meetings, executive escalation, and corrective action management are defined.",
      domainFocus: ["Operational"]
    },
    {
      name: "Security and access controls",
      importance: "Recommended",
      description: "Inspect whether access, identity, security controls, and offboarding duties are appropriate for vendor access.",
      domainFocus: ["Technical", "Compliance"]
    }
  ],
  elevatedReviewTriggers: [
    "Undefined service levels or performance standards",
    "No subcontractor disclosure or approval control",
    "Weak compliance or audit rights",
    "No business continuity obligation",
    "Insurance is missing or inadequate for vendor risk",
    "Unclear accountability for third-party failures",
    "Termination rights do not protect transition needs",
    "Pricing changes or pass-through costs are unrestricted"
  ],
  domainFocus: ["Operational", "Compliance", "Legal", "Financial", "Technical"],
  reviewInstructions: [
    "Focus on whether vendor obligations are measurable, accountable, and operationally enforceable.",
    "Review subcontracting, compliance, audit, continuity, and escalation controls together.",
    "Check whether payment, liability, insurance, and termination terms fit the vendor risk profile.",
    "Escalate gaps that weaken oversight, continuity, reporting, or responsibility for vendor failures."
  ]
};
