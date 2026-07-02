import type { ClauseDomain } from "@/lib/clauses/types";
import type { KBCollection, RetrievalFilters, RetrievalQuery, SessionEvidenceClause, SessionEvidencePackage } from "./types";

const ROUTER_VERSION = "rag-router-v1";
const DEFAULT_TOP_K = 6;
const DEFAULT_MIN_SIMILARITY = 0.5;
const DEFAULT_MAX_QUERIES_PER_CLAUSE = 2;
const DEFAULT_MIN_CLAUSE_RELEVANCE = 0.25;
const MAX_EXCERPT_CHARS = 900;
const MIN_EXCERPT_CHARS = 360;

type RoutingStrategy = "clause_type" | "keyword" | "fallback";
type QueryRole = "primary_clause_guidance" | "secondary_gap_check";

export type BuildRetrievalQueriesOptions = {
  contractTypes?: string[];
  maxQueriesPerClause?: number;
  maxTotalQueries?: number;
  minClauseRelevance?: number;
};

type RouterRule = {
  id: string;
  clauseTypes: string[];
  collections: KBCollection[];
  primaryDomains: ClauseDomain[];
  retrievalTags: string[];
  intentKeywords: string[];
  textSignals: string[];
  queryRole?: QueryRole;
};

type MatchedRoute = {
  rule: RouterRule;
  strategy: RoutingStrategy;
  matchedClauseTypes: string[];
  matchedDomains: ClauseDomain[];
  matchedKeywords: string[];
  titleMatchCount: number;
};

type ClausePriority = {
  clause: SessionEvidenceClause;
  matchedKeywords: string[];
  score: number;
  isImportant: boolean;
};

const HIGH_SIGNAL_CLAUSE_TYPES = new Set([
  "liability",
  "security",
  "data-protection",
  "subcontractors",
  "indemnity",
  "termination",
  "payment",
  "audit",
  "intellectual-property"
]);

const IMPORTANT_KEYWORDS = [
  "unlimited",
  "uncapped",
  "breach",
  "incident",
  "security",
  "personal data",
  "subprocessor",
  "subcontractor",
  "retention",
  "deletion",
  "ai",
  "model training",
  "derived data",
  "transition",
  "termination assistance"
];

const BOILERPLATE_PATTERNS = [
  /^in witness whereof\b/i,
  /^signature\b/i,
  /^name:\s*/i,
  /^title:\s*/i,
  /^date:\s*/i,
  /^page \d+ of \d+/i,
  /^-{3,}$/,
  /^_{3,}$/
];

const ROUTER_RULES: RouterRule[] = [
  {
    id: "liability-risk-allocation",
    clauseTypes: ["liability", "indemnity", "insurance"],
    collections: ["clause_library", "contract_review_playbook", "risk_taxonomy", "contract_review_checklist"],
    primaryDomains: ["Legal", "Financial"],
    retrievalTags: ["liability", "risk allocation", "contract remedy", "fallback language"],
    intentKeywords: ["liability cap", "uncapped exposure", "risk allocation", "contract remedy"],
    textSignals: ["liability", "limitation of liability", "uncapped", "unlimited", "indemnity", "indemnification", "insurance"]
  },
  {
    id: "security-audit-controls",
    clauseTypes: ["security", "audit"],
    collections: ["security_compliance_standards", "clause_library", "contract_review_checklist", "risk_taxonomy"],
    primaryDomains: ["Technical", "Compliance"],
    retrievalTags: ["security controls", "incident response", "breach notification", "audit evidence", "compliance"],
    intentKeywords: ["security controls", "breach notification", "incident response", "audit evidence"],
    textSignals: ["security", "breach", "breach notification", "incident", "incident response", "audit", "encryption", "access control"]
  },
  {
    id: "privacy-ai-data-governance",
    clauseTypes: ["data-protection"],
    collections: ["privacy_data_governance_standards", "security_compliance_standards", "clause_library", "contract_review_checklist"],
    primaryDomains: ["Compliance", "Technical", "Legal"],
    retrievalTags: ["privacy", "data processing", "AI data use", "retention", "deletion", "model training"],
    intentKeywords: ["privacy governance", "data processing", "AI data use", "model training", "derived data"],
    textSignals: [
      "personal data",
      "data processing",
      "privacy",
      "retention",
      "deletion",
      "ai",
      "artificial intelligence",
      "model training",
      "derived data",
      "customer data"
    ]
  },
  {
    id: "subprocessor-vendor-governance",
    clauseTypes: ["subcontractors"],
    collections: ["procurement_policy", "privacy_data_governance_standards", "security_compliance_standards", "contract_review_playbook"],
    primaryDomains: ["Operational", "Compliance"],
    retrievalTags: ["subprocessor", "subcontractor governance", "vendor onboarding", "approval threshold"],
    intentKeywords: ["subprocessor disclosure", "subcontractor governance", "vendor approval", "data processing"],
    textSignals: ["subprocessor", "subcontractor", "third party provider", "vendor management", "prior notice", "approval"]
  },
  {
    id: "payment-commercial-controls",
    clauseTypes: ["payment"],
    collections: ["procurement_policy", "contract_review_playbook", "risk_taxonomy", "clause_library"],
    primaryDomains: ["Financial", "Legal"],
    retrievalTags: ["commercial control", "approval threshold", "pricing", "commercial terms"],
    intentKeywords: ["payment terms", "pricing", "commercial control", "approval threshold"],
    textSignals: ["payment", "fees", "invoice", "pricing", "billing", "taxes", "price increase"]
  },
  {
    id: "termination-transition-support",
    clauseTypes: ["termination", "sla-support", "change-control"],
    collections: ["contract_review_playbook", "contract_review_checklist", "clause_library", "procurement_policy"],
    primaryDomains: ["Operational", "Legal"],
    retrievalTags: ["transition assistance", "business continuity", "termination", "service level", "support"],
    intentKeywords: ["termination", "transition assistance", "operational continuity", "service support"],
    textSignals: ["termination", "terminate", "transition", "termination assistance", "sla", "service level", "support", "availability", "change control"]
  },
  {
    id: "general-review-fallback",
    clauseTypes: ["general"],
    collections: ["contract_review_checklist", "contract_review_playbook", "risk_taxonomy", "company_profile"],
    primaryDomains: ["Operational"],
    retrievalTags: ["checklist", "completeness", "risk category", "preferred position"],
    intentKeywords: ["contract review checklist", "risk classification", "preferred position", "completeness"],
    textSignals: []
  }
];

export function normalizeRetrievalQueryText(value: string): string {
  const withoutBoilerplate = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line)))
    .join(" ");

  const normalized = withoutBoilerplate
    .replace(/[•·▪◦]/g, " ")
    .replace(/[-_=]{3,}/g, " ")
    .replace(/[|]{2,}/g, " ")
    .replace(/[;:,.!?]{2,}/g, (match) => match[0])
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return removeDuplicatePhrases(normalized);
}

export function buildRetrievalQueriesFromEvidence(
  evidence: SessionEvidencePackage,
  options: BuildRetrievalQueriesOptions = {}
): RetrievalQuery[] {
  if (!evidence || evidence.adapterVersion !== "session-evidence-v1" || !Array.isArray(evidence.clauses)) {
    return [];
  }

  const maxQueriesPerClause = normalizePositiveInteger(options.maxQueriesPerClause, DEFAULT_MAX_QUERIES_PER_CLAUSE);
  if (maxQueriesPerClause <= 0) return [];

  const minClauseRelevance = normalizeThreshold(options.minClauseRelevance, DEFAULT_MIN_CLAUSE_RELEVANCE);
  const contractTypes = uniqueStrings(options.contractTypes ?? []);
  const prioritizedClauses = selectImportantClauses(evidence.clauses, minClauseRelevance);
  const maxTotalQueries = normalizePositiveInteger(
    options.maxTotalQueries,
    Math.min(60, Math.max(1, prioritizedClauses.length * 2))
  );

  if (maxTotalQueries <= 0) return [];

  const queries: RetrievalQuery[] = [];

  for (const clausePriority of prioritizedClauses) {
    if (queries.length >= maxTotalQueries) break;

    const routes = selectRoutesForClause(clausePriority.clause).slice(0, maxQueriesPerClause);
    routes.forEach((route, routeIndex) => {
      if (queries.length >= maxTotalQueries) return;
      queries.push(toRetrievalQuery(clausePriority, route, routeIndex, contractTypes));
    });
  }

  return queries;
}

function selectImportantClauses(clauses: readonly SessionEvidenceClause[], minClauseRelevance: number): ClausePriority[] {
  const priorities = clauses.map((clause) => {
    const matchedKeywords = findKeywordMatches(`${clause.title} ${clause.text}`, IMPORTANT_KEYWORDS);
    const clauseTypes = normalizeClauseTypes(clause.clauseTypeHints);
    const hasSpecificType = clauseTypes.some((type) => type !== "general");
    const hasHighSignalType = clauseTypes.some((type) => HIGH_SIGNAL_CLAUSE_TYPES.has(type));
    const relevance = clamp01(clause.relevanceScore ?? 0);
    const titleMatches = findKeywordMatches(clause.title, IMPORTANT_KEYWORDS).length;
    const score = Number(
      Math.min(
        1,
        relevance +
          (hasSpecificType ? 0.22 : 0) +
          (hasHighSignalType ? 0.18 : 0) +
          Math.min(0.26, matchedKeywords.length * 0.04) +
          Math.min(0.12, titleMatches * 0.04)
      ).toFixed(3)
    );

    return {
      clause,
      matchedKeywords,
      score,
      isImportant: hasSpecificType || hasHighSignalType || matchedKeywords.length > 0 || relevance >= minClauseRelevance
    };
  });

  const important = priorities
    .filter((priority) => priority.isImportant && (priority.score >= minClauseRelevance || priority.matchedKeywords.length > 0))
    .sort(compareClausePriority);

  if (important.length > 0) return important;

  return priorities.sort(compareClausePriority).slice(0, clauses.length > 0 ? 1 : 0);
}

function compareClausePriority(left: ClausePriority, right: ClausePriority): number {
  return right.score - left.score || left.clause.order - right.clause.order || left.clause.clauseId.localeCompare(right.clause.clauseId);
}

function selectRoutesForClause(clause: SessionEvidenceClause): MatchedRoute[] {
  const clauseTypes = normalizeClauseTypes(clause.clauseTypeHints);
  const searchableText = `${clause.title} ${clause.text}`;
  const clauseTypeRoutes = ROUTER_RULES.filter((rule) =>
    rule.id !== "general-review-fallback" && rule.clauseTypes.some((type) => clauseTypes.includes(type))
  ).map((rule) => toMatchedRoute(rule, clause, "clause_type"));

  if (clauseTypeRoutes.length > 0) {
    const keywordRoutes = ROUTER_RULES.filter((rule) => rule.id !== "general-review-fallback" && rule.textSignals.length > 0)
      .map((rule) => toMatchedRoute(rule, clause, "keyword"))
      .filter((route) => route.matchedKeywords.length > 0 && !clauseTypeRoutes.some((existing) => existing.rule.id === route.rule.id));

    return [...clauseTypeRoutes, ...keywordRoutes].sort(compareRoutes);
  }

  const keywordRoutes = ROUTER_RULES.filter((rule) => rule.id !== "general-review-fallback" && rule.textSignals.length > 0)
    .map((rule) => toMatchedRoute(rule, clause, "keyword"))
    .filter((route) => route.matchedKeywords.length > 0)
    .sort(compareRoutes);

  if (keywordRoutes.length > 0 || findKeywordMatches(searchableText, IMPORTANT_KEYWORDS).length > 0) {
    return keywordRoutes.length > 0 ? keywordRoutes : [toMatchedRoute(ROUTER_RULES[ROUTER_RULES.length - 1], clause, "keyword")];
  }

  return [toMatchedRoute(ROUTER_RULES[ROUTER_RULES.length - 1], clause, "fallback")];
}

function toMatchedRoute(rule: RouterRule, clause: SessionEvidenceClause, strategy: RoutingStrategy): MatchedRoute {
  const clauseTypes = normalizeClauseTypes(clause.clauseTypeHints);
  const titleText = clause.title;
  const fullText = `${clause.title} ${clause.text}`;
  const matchedKeywords = findKeywordMatches(fullText, [...rule.textSignals, ...rule.intentKeywords, ...rule.retrievalTags]);
  const matchedDomains = uniqueDomains([...(clause.domainHints ?? []), ...rule.primaryDomains]).filter(
    (domain) => rule.primaryDomains.includes(domain) || (clause.domainHints ?? []).includes(domain)
  );

  return {
    rule,
    strategy,
    matchedClauseTypes: rule.clauseTypes.filter((type) => clauseTypes.includes(type)),
    matchedDomains,
    matchedKeywords,
    titleMatchCount: findKeywordMatches(titleText, [...rule.textSignals, ...rule.intentKeywords, ...rule.retrievalTags]).length
  };
}

function compareRoutes(left: MatchedRoute, right: MatchedRoute): number {
  const leftScore = routeStrength(left);
  const rightScore = routeStrength(right);
  return rightScore - leftScore || left.rule.id.localeCompare(right.rule.id);
}

function routeStrength(route: MatchedRoute): number {
  return (
    (route.strategy === "clause_type" ? 10 : route.strategy === "keyword" ? 5 : 1) +
    route.matchedClauseTypes.length * 3 +
    route.matchedKeywords.length +
    route.titleMatchCount * 2 +
    route.matchedDomains.length * 0.5
  );
}

function toRetrievalQuery(
  clausePriority: ClausePriority,
  route: MatchedRoute,
  queryIndexForClause: number,
  contractTypes: string[]
): RetrievalQuery {
  const clause = clausePriority.clause;
  const queryRole: QueryRole = queryIndexForClause === 0 ? "primary_clause_guidance" : route.rule.queryRole ?? "secondary_gap_check";
  const clauseTypes = normalizeClauseTypes(clause.clauseTypeHints);
  const domainHints = uniqueDomains(clause.domainHints ?? []);
  const matchedKeywords = uniqueStrings([...clausePriority.matchedKeywords, ...route.matchedKeywords]);
  const filters: RetrievalFilters = {
    collections: route.rule.collections,
    primaryDomains: uniqueDomains([...route.rule.primaryDomains, ...domainHints]),
    retrievalTags: uniqueStrings([...route.rule.retrievalTags, ...matchedKeywords])
  };

  if (contractTypes.length > 0) {
    filters.contractTypes = contractTypes;
  }

  const queryText = buildQueryText(clause, route, matchedKeywords);
  const filtersApplied = {
    collections: filters.collections ?? [],
    primaryDomains: filters.primaryDomains ?? [],
    retrievalTags: filters.retrievalTags ?? [],
    contractTypes: filters.contractTypes ?? []
  };
  const routingConfidence = calculateRoutingConfidence(clause, route, matchedKeywords);

  return {
    id: `${clause.clauseId.toLowerCase()}-rag-${queryIndexForClause + 1}-${route.rule.id}`,
    queryText,
    intent: route.rule.id,
    sourceClauseId: clause.clauseId,
    topK: DEFAULT_TOP_K,
    minSimilarity: DEFAULT_MIN_SIMILARITY,
    filters,
    metadata: {
      routerVersion: ROUTER_VERSION,
      sourceClauseTitle: clause.title,
      sourceSectionRef: clause.sectionRef,
      clauseTypeHints: clauseTypes,
      domainHints,
      matchedRouterRules: [route.rule.id],
      matchedKeywords,
      routingReason: buildRoutingReason(clause, route, matchedKeywords),
      queryRole,
      queryIndexForClause,
      clauseRelevanceScore: clause.relevanceScore ?? 0,
      contractTypesApplied: contractTypes,
      filtersApplied,
      routingMetadata: {
        matchedClauseTypes: route.matchedClauseTypes,
        matchedDomains: route.matchedDomains,
        matchedKeywords,
        routingStrategy: route.strategy,
        confidence: routingConfidence
      }
    }
  };
}

function buildQueryText(clause: SessionEvidenceClause, route: MatchedRoute, matchedKeywords: string[]): string {
  const intentKeywords = uniqueStrings([...route.rule.intentKeywords, ...matchedKeywords]).slice(0, 10).join(" ");
  const sectionContext = clause.sectionRef && clause.sectionRef !== "Section unknown" ? `Section: ${clause.sectionRef}.` : "";
  const excerpt = buildCompressedClauseExcerpt(clause.text, matchedKeywords);
  return normalizeRetrievalQueryText(`${intentKeywords}. Clause: ${clause.title}. ${sectionContext} ${excerpt}`);
}

function buildCompressedClauseExcerpt(text: string, matchedKeywords: readonly string[]): string {
  const normalized = normalizeRetrievalQueryText(text);
  if (normalized.length <= MAX_EXCERPT_CHARS) return normalized;

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !looksLikeTableOrSignature(sentence));
  const scoredSentences = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: scoreSentenceForRetrieval(sentence, matchedKeywords)
  }));
  const selected = scoredSentences
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 5)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);

  const compressed = selected.length > 0 ? selected.join(" ") : normalized.slice(0, MAX_EXCERPT_CHARS);
  if (compressed.length >= MIN_EXCERPT_CHARS && compressed.length <= MAX_EXCERPT_CHARS) {
    return compressed;
  }

  return deterministicTruncate(compressed.length < MIN_EXCERPT_CHARS ? normalized : compressed, MAX_EXCERPT_CHARS);
}

function scoreSentenceForRetrieval(sentence: string, matchedKeywords: readonly string[]): number {
  const lowered = sentence.toLowerCase();
  const keywordScore = uniqueStrings([...IMPORTANT_KEYWORDS, ...matchedKeywords]).filter((keyword) => lowered.includes(keyword.toLowerCase())).length * 4;
  const obligationScore = /\b(shall|must|required|may not|will|cannot|prior|notice|approval|liability|breach|data|security|termination)\b/i.test(sentence)
    ? 3
    : 0;
  const lengthScore = sentence.length >= 40 && sentence.length <= 360 ? 2 : sentence.length > 360 ? -1 : 0;
  return keywordScore + obligationScore + lengthScore;
}

function calculateRoutingConfidence(clause: SessionEvidenceClause, route: MatchedRoute, matchedKeywords: readonly string[]): number {
  const textLength = normalizeRetrievalQueryText(`${clause.title} ${clause.text}`).length || 1;
  const keywordDensity = Math.min(0.2, matchedKeywords.length / Math.max(20, textLength / 80));
  const confidence =
    0.24 +
    (route.strategy === "clause_type" ? 0.28 : route.strategy === "keyword" ? 0.16 : 0.04) +
    Math.min(0.2, route.matchedDomains.length * 0.04) +
    keywordDensity +
    Math.min(0.18, clamp01(clause.relevanceScore ?? 0) * 0.18) +
    Math.min(0.1, route.titleMatchCount * 0.04);

  return Number(Math.min(0.98, confidence).toFixed(3));
}

function buildRoutingReason(clause: SessionEvidenceClause, route: MatchedRoute, matchedKeywords: readonly string[]): string {
  const clauseReason = clause.routingReason ? `${clause.routingReason} ` : "";
  const keywordReason = matchedKeywords.length > 0 ? `Matched retrieval keywords: ${matchedKeywords.slice(0, 8).join(", ")}.` : "";
  return `${clauseReason}Applied ${route.strategy} route ${route.rule.id}. ${keywordReason}`.trim();
}

function findKeywordMatches(value: string, keywords: readonly string[]): string[] {
  const text = normalizeRetrievalQueryText(value).toLowerCase();
  return uniqueStrings(
    keywords.filter((keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, "i").test(text);
    })
  );
}

function normalizeClauseTypes(values: readonly string[] | undefined): string[] {
  const normalized = uniqueStrings(values ?? []).map((value) => value.toLowerCase());
  return normalized.length > 0 ? normalized : ["general"];
}

function uniqueDomains(values: readonly string[]): ClauseDomain[] {
  const allowed: ClauseDomain[] = ["Financial", "Legal", "Compliance", "Operational", "Technical"];
  const valuesSet = new Set(values);
  return allowed.filter((domain) => valuesSet.has(domain));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizeThreshold(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function removeDuplicatePhrases(value: string): string {
  const phrases = value
    .split(/(?<=[.;])\s+|\s+-\s+/)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
  if (phrases.length <= 1) return value;

  const seen = new Set<string>();
  const deduped = phrases.filter((phrase) => {
    const key = phrase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.join(". ").replace(/\.\s*\./g, ".").trim();
}

function looksLikeTableOrSignature(value: string): boolean {
  const separatorCount = (value.match(/[|_]/g) ?? []).length;
  if (separatorCount >= 4) return true;
  if (/^(name|title|date|signature|by):/i.test(value.trim())) return true;
  return false;
}

function deterministicTruncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const truncated = value.slice(0, maxChars);
  const lastSentence = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf(";"));
  if (lastSentence >= MIN_EXCERPT_CHARS) return truncated.slice(0, lastSentence + 1).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim();
}
