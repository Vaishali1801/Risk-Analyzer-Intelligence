import type { ContractReviewProfile } from "./types";

export const dpaProfile: ContractReviewProfile = {
  contractType: "DPA",
  displayName: "Data Processing Agreement",
  description: "Review profile for agreements governing personal data processing, privacy controls, and processor obligations.",
  profileSignals: {
    strongTitleSignals: [
      "data processing agreement",
      "data processing addendum",
      "data protection addendum",
      "data protection agreement"
    ],
    bodySignals: [
      "controller",
      "processor",
      "subprocessor",
      "personal data",
      "data subject",
      "standard contractual clauses",
      "cross-border transfer",
      "processing instructions"
    ],
    negativeSignals: [
      "non-disclosure agreement",
      "master services agreement",
      "statement of work",
      "subscription services agreement"
    ]
  },
  generallyRequiredClauses: [
    {
      name: "Processing purpose",
      importance: "Generally Required",
      description: "Inspect whether processing is limited to documented instructions and specified business purposes.",
      domainFocus: ["Compliance", "Legal"]
    },
    {
      name: "Data categories",
      importance: "Generally Required",
      description: "Inspect whether personal data, special categories, data subjects, and processing activities are identified.",
      domainFocus: ["Compliance"]
    },
    {
      name: "Controller and processor obligations",
      importance: "Generally Required",
      description: "Inspect whether controller, processor, and service provider roles and responsibilities are clearly allocated.",
      domainFocus: ["Compliance", "Legal"]
    },
    {
      name: "Confidentiality",
      importance: "Generally Required",
      description: "Inspect whether personnel and authorized recipients must protect personal data under confidentiality duties.",
      domainFocus: ["Compliance", "Legal"]
    },
    {
      name: "Breach notification",
      importance: "Generally Required",
      description: "Inspect whether security incidents require prompt notice, investigation support, and sufficient incident details.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Subprocessor approval and notice",
      importance: "Generally Required",
      description: "Inspect whether subprocessors require approval or notice, flow-down terms, and objection rights.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Retention, deletion, and return certification",
      importance: "Generally Required",
      description: "Inspect whether data must be returned or deleted with certification and narrow legal retention exceptions.",
      domainFocus: ["Compliance", "Technical"]
    },
    {
      name: "International transfer mechanisms",
      importance: "Generally Required",
      description: "Inspect whether cross-border transfers rely on lawful mechanisms and required transfer safeguards.",
      domainFocus: ["Compliance", "Legal"]
    },
    {
      name: "Data subject rights support",
      importance: "Generally Required",
      description: "Inspect whether the processor must assist with access, deletion, correction, objection, and portability requests.",
      domainFocus: ["Compliance", "Operational"]
    }
  ],
  recommendedClauses: [
    {
      name: "Audit rights",
      importance: "Recommended",
      description: "Inspect whether audit, assessment, and evidence rights are proportionate and sufficient for oversight.",
      domainFocus: ["Compliance"]
    },
    {
      name: "Encryption and access control",
      importance: "Recommended",
      description: "Inspect whether encryption, access controls, least privilege, and security safeguards are required.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Regulatory and DPIA assistance",
      importance: "Recommended",
      description: "Inspect whether the processor supports regulator inquiries, DPIAs, security assessments, and consultations.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Data localization controls",
      importance: "Recommended",
      description: "Inspect whether residency or localization requirements apply and are operationally supported where needed.",
      domainFocus: ["Compliance", "Technical"]
    },
    {
      name: "Security incident cooperation",
      importance: "Recommended",
      description: "Inspect whether incident response includes containment, investigation, remediation, and customer cooperation.",
      domainFocus: ["Technical", "Operational"]
    },
    {
      name: "Processing records",
      importance: "Recommended",
      description: "Inspect whether processing records, security evidence, and compliance documentation must be maintained.",
      domainFocus: ["Compliance"]
    }
  ],
  elevatedReviewTriggers: [
    "No defined processing purpose",
    "Unclear controller or processor roles",
    "Missing breach notification timeline",
    "Unrestricted subprocessor use",
    "No deletion or return procedure",
    "Weak cross-border transfer controls",
    "No audit or compliance assistance rights",
    "Missing encryption or access control expectations"
  ],
  domainFocus: ["Compliance", "Technical", "Legal", "Operational"],
  reviewInstructions: [
    "Focus on whether processing is limited to documented purposes and data categories.",
    "Review breach, subprocessor, transfer, deletion, and assistance duties as core controls.",
    "Treat technical safeguards as contract obligations when sensitive or regulated data is involved.",
    "Escalate any ambiguity that weakens regulatory cooperation or data subject rights support."
  ]
};
