import { segmentContractClauses } from "@/lib/clauses/segment";
import { tagClauses } from "@/lib/clauses/tag";
import type { SegmentedClause } from "@/lib/clauses/types";
import type { SessionEvidenceClause, SessionEvidencePackage, SessionEvidenceSource } from "./types";

export type BuildSessionEvidencePackageOptions = {
  source?: SessionEvidenceSource;
};

type LocatedClause = {
  charStart?: number;
  charEnd?: number;
};

export function buildSessionEvidencePackage(
  contractText: string,
  options: BuildSessionEvidencePackageOptions = {}
): SessionEvidencePackage {
  const normalizedText = normalizeContractText(contractText);
  const segmentedClauses = segmentContractClauses(contractText);
  const taggedClauses = tagClauses(segmentedClauses);
  const clauseLocations = locateClauses(normalizedText, segmentedClauses);
  const clauses = taggedClauses.map<SessionEvidenceClause>((taggedClause, index) => {
    const clause = taggedClause.clause;
    const tagging = taggedClause.tagging;
    const location = clauseLocations[index] ?? {};
    const clauseTypeHints = dedupeStrings(tagging.clauseTypeHints);
    const domainHints = dedupeStrings(tagging.domainHints);

    return {
      clauseId: clause.clauseId,
      order: clause.order,
      sectionRef: clause.sectionRef,
      pageRef: clause.pageRef,
      title: clause.title,
      text: clause.text,
      clauseType: clauseTypeHints[0],
      clauseTypeHints,
      domainSignals: domainHints,
      domainHints,
      charStart: location.charStart,
      charEnd: location.charEnd,
      tokenEstimate: estimateTokensFromText(clause.text),
      relevanceScore: tagging.relevanceScore,
      routingReason: tagging.routingReason
    };
  });

  return {
    adapterVersion: "session-evidence-v1",
    source: options.source,
    sourceTextLength: contractText.length,
    normalizedTextLength: normalizedText.length,
    clauseCount: clauses.length,
    tokenEstimate: clauses.reduce((total, clause) => total + (clause.tokenEstimate ?? 0), 0),
    clauses
  };
}

export function estimateTokensFromText(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

function locateClauses(normalizedText: string, clauses: SegmentedClause[]): LocatedClause[] {
  let searchStart = 0;

  return clauses.map((clause) => {
    const clauseText = normalizeContractText(clause.text);
    const foundAt = clauseText ? normalizedText.indexOf(clauseText, searchStart) : -1;

    if (foundAt < 0) {
      return {};
    }

    const charEnd = foundAt + clauseText.length;
    searchStart = charEnd;

    return {
      charStart: foundAt,
      charEnd
    };
  });
}

function normalizeContractText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeStrings<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}
