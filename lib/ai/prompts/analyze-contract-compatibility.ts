const RISK_CATEGORIES = ["Legal", "Financial", "Operational", "Compliance", "Technical"] as const;
const SEVERITIES = ["High", "Medium", "Low"] as const;

type PlainRecord = Record<string, unknown>;
type RiskCategory = (typeof RISK_CATEGORIES)[number];
type Severity = (typeof SEVERITIES)[number];

export function adaptRawAnalysisForSchema(raw: unknown): unknown {
  if (!isPlainObject(raw)) {
    return raw;
  }

  const adapted = cloneJsonLike(raw);
  const risks = getArray(adapted.risks).map((risk, index) => adaptRiskForSchema(risk, index));
  const gapSource = Array.isArray(adapted.gapAnalysis) ? adapted.gapAnalysis : adapted.gaps;
  const gapAnalysis = getArray(gapSource).map((gap, index) => adaptGapForSchema(gap, index));

  return {
    ...adapted,
    contractTitle: getExistingOrDefault(adapted.contractTitle, "Uploaded Contract"),
    executiveSummary: getExistingOrDefault(adapted.executiveSummary, ""),
    aiInsight: getExistingOrDefault(adapted.aiInsight, ""),
    overallRiskLevel: getKnownSeverity(adapted.overallRiskLevel) ?? "Medium",
    decisionRecommendation: getDecisionRecommendation(adapted.decisionRecommendation) ?? "Renegotiate",
    decisionRationale: getExistingOrDefault(
      adapted.decisionRationale,
      "Preliminary compatibility value; final decision is derived by the application."
    ),
    riskSummary: isPlainObject(adapted.riskSummary) ? adapted.riskSummary : buildRiskSummary(risks),
    topCriticalRisks: getNonEmptyStringArray(adapted.topCriticalRisks) ?? buildTopCriticalRisks(risks),
    risks,
    gapAnalysis,
    nextActions: getNonEmptyStringArray(adapted.nextActions) ?? buildNextActions(risks, gapAnalysis),
  };
}

function adaptRiskForSchema(value: unknown, index: number): unknown {
  if (!isPlainObject(value)) {
    return value;
  }

  const risk = cloneJsonLike(value);
  const evidence = isPlainObject(risk.evidence) ? risk.evidence : undefined;

  return {
    ...risk,
    id: getExistingOrDefault(risk.id, `risk-${index + 1}`),
    clauseRef: getExistingOrDefault(risk.clauseRef, getExistingOrDefault(evidence?.sectionRef, "Contract")),
    mitigability: typeof risk.mitigability === "string" && risk.mitigability.trim() ? risk.mitigability : "Medium",
  };
}

function adaptGapForSchema(value: unknown, index: number): unknown {
  if (!isPlainObject(value)) {
    return value;
  }

  const gap = cloneJsonLike(value);

  return {
    ...gap,
    id: getExistingOrDefault(gap.id, `gap-${index + 1}`),
    status: getGapStatus(gap.status) ?? "Pending",
  };
}

function buildRiskSummary(risks: unknown[]) {
  const summary = {
    total: risks.length,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {
      Legal: 0,
      Financial: 0,
      Operational: 0,
      Compliance: 0,
      Technical: 0,
    },
  };

  risks.forEach((risk) => {
    if (!isPlainObject(risk)) {
      summary.medium += 1;
      summary.byCategory.Operational += 1;
      return;
    }

    const severity = getKnownSeverity(risk.severity) ?? "Medium";
    if (severity === "High") summary.high += 1;
    if (severity === "Medium") summary.medium += 1;
    if (severity === "Low") summary.low += 1;

    const category = getKnownCategory(risk.category) ?? "Operational";
    summary.byCategory[category] += 1;
  });

  return summary;
}

function buildTopCriticalRisks(risks: unknown[]) {
  const titles = risks
    .map((risk) => (isPlainObject(risk) ? getCleanString(risk.title) : ""))
    .filter(Boolean)
    .slice(0, 5);

  return titles.length ? titles : ["No high-confidence risks identified."];
}

function buildNextActions(risks: unknown[], gaps: unknown[]) {
  if (risks.length && gaps.length) {
    return ["Review identified risks and gaps before approval."];
  }

  if (risks.length) {
    return ["Review identified risks before approval."];
  }

  if (gaps.length) {
    return ["Review identified gaps before approval."];
  }

  return ["Review identified risks and gaps before approval."];
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getNonEmptyStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.length && value.every((item) => typeof item === "string" && item.trim())
    ? value
    : undefined;
}

function getExistingOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getDecisionRecommendation(value: unknown) {
  return value === "Accept" || value === "Renegotiate" || value === "Reject" ? value : undefined;
}

function getGapStatus(value: unknown) {
  return value === "Pending" || value === "Accepted" || value === "Rejected" ? value : undefined;
}

function getKnownSeverity(value: unknown): Severity | undefined {
  return SEVERITIES.includes(value as Severity) ? (value as Severity) : undefined;
}

function getKnownCategory(value: unknown): RiskCategory | undefined {
  return RISK_CATEGORIES.includes(value as RiskCategory) ? (value as RiskCategory) : undefined;
}

function getCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value: unknown): value is PlainRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonLike<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonLike(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonLike(item)])) as T;
  }

  return value;
}
