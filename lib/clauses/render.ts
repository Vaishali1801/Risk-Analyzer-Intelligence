import type { ClauseBatch } from "./types";

const ADVISORY_NOTE =
  "Domain and clause type hints are advisory routing metadata only. Use the contract text and configured guidance to determine final risk/gap category, severity, impact, action, and confidence.";

export function renderClauseBatch(batch: ClauseBatch): string {
  const lines = [
    `Batch ${normalizeInlineText(batch.batchId)}`,
    `domains: ${renderHints(batch.domainHints)}`,
    `types: ${renderHints(batch.clauseTypeHints)}`
  ];

  batch.clauses.forEach((taggedClause) => {
    lines.push(
      "",
      `[${normalizeInlineText(taggedClause.clause.clauseId)}]`,
      `sectionRef: ${normalizeInlineText(taggedClause.clause.sectionRef)}`,
      `title: ${normalizeInlineText(taggedClause.clause.title)}`,
      `domainHints: ${renderHints(taggedClause.tagging.domainHints)}`,
      `clauseTypeHints: ${renderHints(taggedClause.tagging.clauseTypeHints)}`,
      "text:",
      normalizeBlockText(taggedClause.clause.text)
    );
  });

  return lines.join("\n").trim();
}

export function renderClauseBatches(batches: ClauseBatch[]): string {
  if (!batches.length) {
    return "DOCUMENT CLAUSE MAP\nNo clauses available.";
  }

  return ["DOCUMENT CLAUSE MAP", ADVISORY_NOTE, "", batches.map(renderClauseBatch).join("\n\n")].join("\n").trim();
}

function renderHints(values: readonly string[]) {
  const hints = dedupe(values.map(normalizeInlineText).filter(Boolean));
  return hints.length ? hints.join(", ") : "None";
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBlockText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
