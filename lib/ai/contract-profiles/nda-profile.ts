import type { ContractReviewProfile } from "./types";

export const ndaProfile: ContractReviewProfile = {
  contractType: "NDA",
  displayName: "Non-Disclosure Agreement",
  description: "Review profile for confidentiality-focused agreements covering restricted information exchange and permitted use.",
  profileSignals: {
    strongTitleSignals: [
      "non-disclosure agreement",
      "nondisclosure agreement",
      "confidentiality and non-disclosure agreement",
      "mutual non-disclosure agreement",
      "confidentiality agreement"
    ],
    bodySignals: [
      "confidential information",
      "disclosing party",
      "receiving party",
      "recipient shall protect",
      "purpose of evaluating",
      "return or destroy"
    ],
    negativeSignals: [
      "data processing agreement",
      "master services agreement",
      "software as a service",
      "subscription services agreement",
      "statement of work"
    ]
  },
  generallyRequiredClauses: [
    {
      name: "Definition of confidential information",
      importance: "Generally Required",
      description: "Inspect whether protected information, exclusions, and non-written disclosures are clearly defined.",
      domainFocus: ["Legal"]
    },
    {
      name: "Confidentiality obligations",
      importance: "Generally Required",
      description: "Inspect whether use, disclosure, and protection duties are limited to the permitted business purpose.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "Permitted disclosure",
      importance: "Generally Required",
      description: "Inspect whether disclosures to representatives, affiliates, advisers, and required recipients are controlled.",
      domainFocus: ["Legal", "Operational"]
    },
    {
      name: "Protection obligations",
      importance: "Generally Required",
      description: "Inspect whether the recipient must use reasonable safeguards and prevent unauthorized access or misuse.",
      domainFocus: ["Compliance", "Technical"]
    },
    {
      name: "Compelled disclosure procedure",
      importance: "Generally Required",
      description: "Inspect whether legal-process disclosures require prompt notice, cooperation, and narrow production where allowed.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "Return or destruction",
      importance: "Generally Required",
      description: "Inspect whether confidential information must be returned or destroyed at request or termination.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Survival period",
      importance: "Generally Required",
      description: "Inspect whether confidentiality duties survive for an appropriate period or while information remains protected.",
      domainFocus: ["Legal"]
    },
    {
      name: "Breach notification",
      importance: "Generally Required",
      description: "Inspect whether unauthorized access, disclosure, or misuse must be reported promptly with cooperation duties.",
      domainFocus: ["Compliance", "Operational"]
    },
    {
      name: "Governing law and jurisdiction",
      importance: "Generally Required",
      description: "Inspect whether governing law and forum are clear and commercially workable for enforcement.",
      domainFocus: ["Legal"]
    }
  ],
  recommendedClauses: [
    {
      name: "Residual knowledge limits",
      importance: "Recommended",
      description: "Inspect whether residual knowledge rights exclude memorized source materials, trade secrets, and intentional retention.",
      domainFocus: ["Legal"]
    },
    {
      name: "Derived information treatment",
      importance: "Recommended",
      description: "Inspect whether analyses, summaries, outputs, and derivative materials remain protected when based on confidential information.",
      domainFocus: ["Legal", "Compliance"]
    },
    {
      name: "AI and model training restrictions",
      importance: "Recommended",
      description: "Inspect whether confidential information is barred from model training, tuning, evaluation, or product improvement without consent.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Embeddings and vectorized representations",
      importance: "Recommended",
      description: "Inspect whether embeddings, vector stores, and similar representations are treated as protected derived information.",
      domainFocus: ["Technical", "Compliance"]
    },
    {
      name: "Subcontractor sharing controls",
      importance: "Recommended",
      description: "Inspect whether onward disclosure requires need-to-know access, equivalent confidentiality duties, and recipient responsibility.",
      domainFocus: ["Operational", "Compliance"]
    },
    {
      name: "Retention exception limits",
      importance: "Recommended",
      description: "Inspect whether archival, legal, backup, and compliance retention exceptions are narrow and remain confidential.",
      domainFocus: ["Compliance", "Legal"]
    }
  ],
  elevatedReviewTriggers: [
    "Overbroad residual knowledge rights",
    "Unrestricted AI or model training use",
    "No return or destruction obligation",
    "Undefined confidential information",
    "Broad subcontractor disclosure rights",
    "Missing breach notification",
    "Long retention rights without limits",
    "Derived data or embeddings excluded from protection"
  ],
  domainFocus: ["Legal", "Compliance", "Technical", "Operational"],
  reviewInstructions: [
    "Focus on whether information use is tightly limited to the stated business purpose.",
    "Treat AI training, embeddings, and derived information as sensitive unless expressly controlled.",
    "Review disclosure rights against confidentiality, subcontractor, and compelled-disclosure protections.",
    "Escalate missing breach notice, return, destruction, or survival language when confidential information is material."
  ]
};
