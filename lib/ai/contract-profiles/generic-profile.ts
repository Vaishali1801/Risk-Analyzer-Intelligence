import type { ContractReviewProfile } from "./types";

export const genericProfile: ContractReviewProfile = {
  contractType: "Generic Agreement",
  displayName: "Generic Agreement",
  description:
    "Fallback enterprise review profile for contracts that do not clearly match a specific agreement type or combine multiple agreement patterns.",
  // Generic profile signals are intentionally empty because Generic Agreement is selected only as a fallback.
  profileSignals: {
    strongTitleSignals: [],
    bodySignals: [],
    negativeSignals: []
  },
  generallyRequiredClauses: [
    {
      name: "Parties and scope",
      importance: "Generally Required",
      description: "Identify the parties, contract purpose, covered services or deliverables, and scope boundaries.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Payment obligations",
      importance: "Generally Required",
      description: "Define fees, invoicing, payment timing, taxes, disputes, and withholding rights where payment applies.",
      domainFocus: ["Financial"]
    },
    {
      name: "Confidentiality expectations",
      importance: "Generally Required",
      description: "Set expectations for protecting confidential information and limiting disclosure or misuse.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "Liability allocation",
      importance: "Generally Required",
      description: "Allocate liability, caps, exclusions, indemnities, and responsibility for material losses.",
      domainFocus: ["Legal", "Financial"]
    },
    {
      name: "Termination conditions",
      importance: "Generally Required",
      description: "State termination rights, cure periods, post-termination obligations, and transition expectations.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Operational responsibilities",
      importance: "Generally Required",
      description: "Clarify delivery, cooperation, approval, dependency, support, and accountability obligations.",
      domainFocus: ["Operational"]
    },
    {
      name: "Dispute handling",
      importance: "Generally Required",
      description: "Define escalation, dispute resolution process, and responsibility while issues are pending.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Governing law and jurisdiction",
      importance: "Generally Required",
      description: "Identify governing law, venue, jurisdiction, and related legal forum expectations.",
      domainFocus: ["Legal"]
    }
  ],
  recommendedClauses: [
    {
      name: "Audit rights",
      importance: "Recommended",
      description: "Include proportionate audit or inspection rights where compliance, security, or operational reliance is material.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Security obligations",
      importance: "Recommended",
      description: "Add security controls where confidential information, regulated data, systems access, or operational dependency is involved.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Ownership and IP treatment",
      importance: "Recommended",
      description: "Clarify ownership, licenses, work product, background IP, and use restrictions.",
      domainFocus: ["Legal"]
    },
    {
      name: "Reporting and escalation obligations",
      importance: "Recommended",
      description: "Define reporting, notice, governance, or escalation duties where operational dependency exists.",
      domainFocus: ["Operational", "Compliance"]
    }
  ],
  elevatedReviewTriggers: [
    "Conflicting obligations",
    "Undefined ownership rights",
    "Vague operational commitments",
    "Ambiguous accountability",
    "Disproportionate risk allocation",
    "Missing confidentiality, liability, or termination protections where material"
  ],
  domainFocus: ["Legal", "Compliance", "Operational", "Financial", "Technical"],
  reviewInstructions: [
    "Use this profile as a fallback when the agreement type is unclear, mixed, or not yet classified.",
    "Apply the profile with professional judgment and rely on the actual contract language as the source of truth.",
    "Treat generally required and recommended clauses as review guidance, not automatic findings.",
    "Escalate issues only when supported by contract text or by the material absence of an expected enterprise protection."
  ]
};
