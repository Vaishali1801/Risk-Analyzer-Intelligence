import type { ContractReviewProfile } from "./types";

export const saasProfile: ContractReviewProfile = {
  contractType: "SaaS",
  displayName: "SaaS Agreement",
  description: "Review profile for subscription software agreements covering service access, security, data handling, and availability.",
  profileSignals: {
    strongTitleSignals: [
      "software as a service",
      "saas agreement",
      "subscription services agreement",
      "cloud services agreement",
      "online services agreement"
    ],
    bodySignals: [
      "uptime",
      "service credits",
      "customer data",
      "support services",
      "subscription term",
      "authorized users",
      "availability commitment",
      "admin account"
    ],
    negativeSignals: [
      "non-disclosure agreement",
      "data processing agreement",
      "master services agreement",
      "vendor agreement"
    ]
  },
  generallyRequiredClauses: [
    {
      name: "Service description",
      importance: "Generally Required",
      description: "Inspect whether hosted functionality, usage rights, exclusions, and service boundaries are clear.",
      domainFocus: ["Operational", "Technical"]
    },
    {
      name: "Subscription, pricing, and payment",
      importance: "Generally Required",
      description: "Inspect whether fees, renewals, usage limits, taxes, payment timing, and price changes are defined.",
      domainFocus: ["Financial"]
    },
    {
      name: "SLA and uptime",
      importance: "Generally Required",
      description: "Inspect whether availability commitments, measurement methods, exclusions, and maintenance windows are stated.",
      domainFocus: ["Operational", "Technical"]
    },
    {
      name: "Support",
      importance: "Generally Required",
      description: "Inspect whether support channels, response targets, severity levels, and escalation paths are defined.",
      domainFocus: ["Operational"]
    },
    {
      name: "Security",
      importance: "Generally Required",
      description: "Inspect whether baseline security controls, vulnerability management, and access protections are contractually required.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Customer data handling",
      importance: "Generally Required",
      description: "Inspect whether customer data use, storage, processing, retention, and deletion are restricted.",
      domainFocus: ["Compliance", "Technical"]
    },
    {
      name: "Admin and customer access controls",
      importance: "Generally Required",
      description: "Inspect whether account administration, user access, authentication, and customer responsibilities are clear.",
      domainFocus: ["Technical", "Operational"]
    },
    {
      name: "Confidentiality",
      importance: "Generally Required",
      description: "Inspect whether confidential business, technical, and customer information is protected.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "Limitation of liability",
      importance: "Generally Required",
      description: "Inspect whether liability caps and carveouts align with security, data, availability, and payment risk.",
      domainFocus: ["Legal", "Financial"]
    },
    {
      name: "Termination and suspension rights",
      importance: "Generally Required",
      description: "Inspect whether termination, suspension, cure, access cutoff, and post-termination obligations are balanced.",
      domainFocus: ["Legal", "Operational"]
    }
  ],
  recommendedClauses: [
    {
      name: "Service credits",
      importance: "Recommended",
      description: "Inspect whether credits are measurable, claimable, and not an overbroad exclusive remedy.",
      domainFocus: ["Financial", "Operational"]
    },
    {
      name: "Disaster recovery and business continuity",
      importance: "Recommended",
      description: "Inspect whether recovery targets, backup practices, continuity commitments, and testing expectations exist.",
      domainFocus: ["Technical", "Operational"]
    },
    {
      name: "Incident notification",
      importance: "Recommended",
      description: "Inspect whether security, privacy, and availability incidents require timely notice and cooperation.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "AI and customer data usage restrictions",
      importance: "Recommended",
      description: "Inspect whether customer data is restricted from model training, analytics, benchmarking, or product improvement without consent.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Change management",
      importance: "Recommended",
      description: "Inspect whether material service, feature, policy, or integration changes require notice and mitigation rights.",
      domainFocus: ["Operational", "Technical"]
    },
    {
      name: "Data portability and export",
      importance: "Recommended",
      description: "Inspect whether customers can export data in usable formats during the term and after termination.",
      domainFocus: ["Operational", "Compliance"]
    }
  ],
  elevatedReviewTriggers: [
    "No measurable uptime or support commitment",
    "Service credits are unavailable or exclusive remedy is overbroad",
    "Unrestricted customer data use or AI training rights",
    "Missing incident notification",
    "Weak data return or export rights",
    "Unilateral material service changes",
    "No disaster recovery or continuity commitment",
    "Liability cap excludes key security or data exposures"
  ],
  domainFocus: ["Technical", "Operational", "Compliance", "Financial", "Legal"],
  reviewInstructions: [
    "Review service availability, support, security, and data handling as connected operational controls.",
    "Treat AI and customer data usage rights as elevated issues unless expressly limited.",
    "Check whether remedies, credits, and liability terms align with service criticality.",
    "Escalate weak continuity, incident notice, export, or transition terms for business-critical SaaS."
  ]
};
