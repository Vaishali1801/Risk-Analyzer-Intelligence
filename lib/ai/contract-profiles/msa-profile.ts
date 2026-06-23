import type { ContractReviewProfile } from "./types";

export const msaProfile: ContractReviewProfile = {
  contractType: "MSA",
  displayName: "Master Services Agreement",
  description: "Review profile for umbrella services agreements governing statements of work, delivery, risk allocation, and operations.",
  profileSignals: {
    strongTitleSignals: [
      "master services agreement",
      "master service agreement",
      "professional services agreement",
      "framework services agreement"
    ],
    bodySignals: [
      "statement of work",
      "sow",
      "work order",
      "change request",
      "acceptance criteria",
      "deliverables",
      "order of precedence"
    ],
    negativeSignals: [
      "non-disclosure agreement",
      "data processing agreement",
      "software as a service",
      "subscription services agreement"
    ]
  },
  generallyRequiredClauses: [
    {
      name: "Scope governance",
      importance: "Generally Required",
      description: "Inspect whether services, exclusions, dependencies, and authority to approve scope are clearly defined.",
      domainFocus: ["Operational", "Legal"]
    },
    {
      name: "SOW framework and conflict handling",
      importance: "Generally Required",
      description: "Inspect whether each SOW must define deliverables, milestones, fees, and how conflicts with the MSA are resolved.",
      domainFocus: ["Operational", "Financial"]
    },
    {
      name: "Order of precedence",
      importance: "Generally Required",
      description: "Inspect whether the hierarchy among the MSA, SOWs, exhibits, policies, and purchase orders is explicit.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Payment governance",
      importance: "Generally Required",
      description: "Inspect whether invoicing, taxes, expenses, disputes, late payment, and withholding rights are controlled.",
      domainFocus: ["Financial"]
    },
    {
      name: "Liability allocation",
      importance: "Generally Required",
      description: "Inspect whether caps, exclusions, carveouts, indemnities, and remedy limits match the service risk.",
      domainFocus: ["Legal", "Financial"]
    },
    {
      name: "Confidentiality",
      importance: "Generally Required",
      description: "Inspect whether shared business, technical, and customer information is protected across services and SOWs.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "IP and work product ownership",
      importance: "Generally Required",
      description: "Inspect whether deliverables, background IP, licenses, feedback, and work product ownership are clear.",
      domainFocus: ["Legal"]
    },
    {
      name: "Termination",
      importance: "Generally Required",
      description: "Inspect whether termination rights, cure periods, SOW effects, and post-termination obligations are workable.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Dispute resolution",
      importance: "Generally Required",
      description: "Inspect whether escalation, forum, interim performance, and dispute timelines are commercially practical.",
      domainFocus: ["Legal"]
    },
    {
      name: "Subcontractor responsibility",
      importance: "Generally Required",
      description: "Inspect whether subcontractor use is disclosed, controlled, and remains the supplier's responsibility.",
      domainFocus: ["Operational", "Compliance"]
    }
  ],
  recommendedClauses: [
    {
      name: "Change request governance",
      importance: "Recommended",
      description: "Inspect whether scope, timeline, price, and responsibility changes require documented approval before implementation.",
      domainFocus: ["Operational", "Financial"]
    },
    {
      name: "Acceptance criteria",
      importance: "Recommended",
      description: "Inspect whether objective acceptance standards, review periods, rejection rights, and deemed acceptance are defined.",
      domainFocus: ["Operational"]
    },
    {
      name: "Escalation process",
      importance: "Recommended",
      description: "Inspect whether operational and executive escalation paths exist for blocked delivery or recurring disputes.",
      domainFocus: ["Operational"]
    },
    {
      name: "Transition assistance",
      importance: "Recommended",
      description: "Inspect whether termination or expiration includes reasonable handoff, knowledge transfer, and continuity support.",
      domainFocus: ["Operational", "Legal"]
    },
    {
      name: "Audit and records",
      importance: "Recommended",
      description: "Inspect whether records, audit access, and review limits support compliance without excessive disruption.",
      domainFocus: ["Compliance", "Financial"]
    },
    {
      name: "Dependency and delay management",
      importance: "Recommended",
      description: "Inspect whether customer dependencies, delayed approvals, and third-party delays adjust obligations and timelines.",
      domainFocus: ["Operational", "Financial"]
    }
  ],
  elevatedReviewTriggers: [
    "SOW terms conflict with master terms",
    "Unclear acceptance or deemed acceptance standard",
    "Uncapped or one-sided liability exposure",
    "Undefined ownership of deliverables",
    "No change control for scope growth",
    "Weak subcontractor accountability",
    "Termination without transition support",
    "Payment rights tied to vague milestones"
  ],
  domainFocus: ["Legal", "Operational", "Financial", "Compliance"],
  reviewInstructions: [
    "Review whether the MSA and SOW framework allocate responsibility without conflict.",
    "Check payment, scope, acceptance, and change control together for delivery risk.",
    "Treat IP, confidentiality, liability, and termination as core negotiation controls.",
    "Escalate operational gaps when they affect delivery, handoff, support, or transition."
  ]
};
