import { RISK_DOMAINS, type RiskDomain } from "../ai/config/category-rules";
import type { ClauseDomain, ClauseTagging, SegmentedClause, TaggedClause } from "./types";

type ClauseTypeRule = {
  type: string;
  domains: RiskDomain[];
  keywords: string[];
};

type RuleMatch = {
  type: string;
  domains: RiskDomain[];
  signals: string[];
};

const DOMAIN_ORDER: RiskDomain[] = [...RISK_DOMAINS];

// Clause tagging is deterministic pre-LLM routing metadata only.
// domainHints are advisory hints for packaging/retrieval, not final risk or gap categories.
// The LLM proposes final categories later, and schema/app normalization can override them.
const CLAUSE_TYPE_RULES: ClauseTypeRule[] = [
  {
    type: "payment",
    domains: ["Financial"],
    keywords: ["payment", "fees", "fee", "invoice", "invoicing", "taxes", "price increase", "pricing", "billing"]
  },
  {
    type: "liability",
    domains: ["Legal"],
    keywords: ["liability", "limitation of liability", "consequential damages", "indirect damages", "liability cap", "uncapped"]
  },
  {
    type: "indemnity",
    domains: ["Legal"],
    keywords: ["indemnity", "indemnify", "indemnification", "defend", "hold harmless"]
  },
  {
    type: "termination",
    domains: ["Legal"],
    keywords: ["termination", "terminate", "cure period", "material breach", "expiration"]
  },
  {
    type: "confidentiality",
    domains: ["Legal", "Compliance"],
    keywords: ["confidential", "confidentiality", "non-disclosure", "proprietary information"]
  },
  {
    type: "intellectual-property",
    domains: ["Legal"],
    keywords: ["intellectual property", "ip rights", "ownership", "license", "work product", "deliverables"]
  },
  {
    type: "data-protection",
    domains: ["Compliance", "Technical"],
    keywords: ["data protection", "personal data", "privacy", "data processing", "retention", "data deletion", "regulatory"]
  },
  {
    type: "security",
    domains: ["Technical", "Compliance"],
    keywords: ["security", "breach", "breach notification", "encryption", "access control", "cybersecurity", "incident response"]
  },
  {
    type: "audit",
    domains: ["Compliance"],
    keywords: ["audit", "inspection", "records", "certification", "compliance review"]
  },
  {
    type: "sla-support",
    domains: ["Operational"],
    keywords: ["sla", "service level", "support", "availability", "uptime", "service credits", "response time"]
  },
  {
    type: "subcontractors",
    domains: ["Operational", "Compliance"],
    keywords: ["subcontractor", "subprocessor", "third party provider", "vendor management"]
  },
  {
    type: "change-control",
    domains: ["Operational"],
    keywords: ["change control", "change management", "change request", "scope change"]
  },
  {
    type: "warranties",
    domains: ["Legal"],
    keywords: ["warranty", "warranties", "representation", "disclaimer"]
  },
  {
    type: "insurance",
    domains: ["Legal", "Financial"],
    keywords: ["insurance", "insured", "coverage", "policy limits"]
  },
  {
    type: "governing-law",
    domains: ["Legal"],
    keywords: ["governing law", "jurisdiction", "venue", "dispute resolution"]
  },
  {
    type: "notices",
    domains: ["Operational", "Legal"],
    keywords: ["notice", "notices", "email notice", "written notice"]
  }
];

export function tagClause(clause: SegmentedClause): ClauseTagging {
  const searchableText = `${clause.sectionRef} ${clause.title} ${clause.text}`.toLowerCase();
  const matches = CLAUSE_TYPE_RULES.map((rule) => ({
    type: rule.type,
    domains: rule.domains,
    signals: rule.keywords.filter((keyword) => containsSignal(searchableText, keyword))
  })).filter((match) => match.signals.length > 0);

  if (!matches.length) {
    return {
      clauseId: clause.clauseId,
      clauseTypeHints: ["general"],
      domainHints: ["Operational"],
      relevanceScore: 0.15,
      routingReason: "No strong enterprise clause signals matched; defaulted to Operational/general hints."
    };
  }

  const clauseTypeHints = matches
    .sort((left, right) => right.signals.length - left.signals.length || left.type.localeCompare(right.type))
    .map((match) => match.type);
  const domainHints = rankDomains(matches);
  const matchedSignals = Array.from(new Set(matches.flatMap((match) => match.signals))).slice(0, 5);
  const relevanceScore = Math.min(1, Number((0.25 + matchedSignals.length * 0.12 + clauseTypeHints.length * 0.04).toFixed(2)));

  return {
    clauseId: clause.clauseId,
    clauseTypeHints,
    domainHints,
    relevanceScore,
    routingReason: `Matched ${matchedSignals.join(", ")} signals for ${domainHints.join("/")} routing.`
  };
}

export function tagClauses(clauses: SegmentedClause[]): TaggedClause[] {
  return clauses.map((clause) => ({
    clause,
    tagging: tagClause(clause)
  }));
}

function containsSignal(text: string, keyword: string) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, "i").test(text);
}

function rankDomains(matches: RuleMatch[]): ClauseDomain[] {
  const scores = new Map<RiskDomain, number>();

  matches.forEach((match) => {
    match.domains.forEach((domain) => {
      scores.set(domain, (scores.get(domain) ?? 0) + match.signals.length);
    });
  });

  return DOMAIN_ORDER.filter((domain) => scores.has(domain)).sort((left, right) => {
    const scoreDifference = (scores.get(right) ?? 0) - (scores.get(left) ?? 0);
    return scoreDifference || DOMAIN_ORDER.indexOf(left) - DOMAIN_ORDER.indexOf(right);
  });
}
