import type { SegmentedClause } from "./types";

const MIN_CLAUSE_TEXT_LENGTH = 40;

type HeadingMatch = {
  sectionRef: string;
  title: string;
};

type ClauseDraft = {
  sectionRef: string;
  title: string;
  blocks: string[];
};

export function segmentContractClauses(text: string): SegmentedClause[] {
  const normalized = normalizeContractText(text);

  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const drafts: ClauseDraft[] = [];
  let current: ClauseDraft | null = null;
  let detectedHeadings = 0;

  blocks.forEach((block) => {
    const heading = detectBlockHeading(block);

    if (heading) {
      detectedHeadings += 1;
      pushDraft(drafts, current);
      current = {
        sectionRef: heading.sectionRef,
        title: heading.title,
        blocks: [block]
      };
      return;
    }

    if (!current) {
      current = {
        sectionRef: "Section unknown",
        title: "Untitled clause",
        blocks: []
      };
    }

    current.blocks.push(block);
  });

  pushDraft(drafts, current);

  if (!detectedHeadings) {
    return [
      {
        clauseId: "CL-001",
        order: 1,
        sectionRef: "Section unknown",
        title: "Contract text",
        text: normalized
      }
    ];
  }

  return drafts
    .map((draft) => ({
      sectionRef: draft.sectionRef || "Section unknown",
      title: draft.title || "Untitled clause",
      text: draft.blocks.join("\n\n").trim()
    }))
    .filter((draft) => draft.text.length >= MIN_CLAUSE_TEXT_LENGTH)
    .map((draft, index) => ({
      clauseId: formatClauseId(index + 1),
      order: index + 1,
      sectionRef: draft.sectionRef,
      title: draft.title,
      text: draft.text
    }));
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

function pushDraft(drafts: ClauseDraft[], draft: ClauseDraft | null) {
  if (!draft) return;

  const text = draft.blocks.join("\n\n").trim();
  if (!text) return;

  drafts.push(draft);
}

function detectBlockHeading(block: string): HeadingMatch | null {
  const [firstLine = ""] = block.split("\n");
  const line = firstLine.trim();

  return detectSectionHeading(line) ?? detectArticleHeading(line) ?? detectNumberedHeading(line) ?? detectAllCapsHeading(line);
}

function detectSectionHeading(line: string): HeadingMatch | null {
  const match = line.match(/^(Section\s+[A-Za-z0-9]+(?:[.\-][A-Za-z0-9]+)*)\s*(?:[:.\-]\s+|\s+)(.{2,120})$/i);
  if (!match) return null;

  return {
    sectionRef: cleanSectionRef(match[1]),
    title: cleanTitle(match[2])
  };
}

function detectArticleHeading(line: string): HeadingMatch | null {
  const match = line.match(/^(ARTICLE\s+[IVXLCDM0-9]+)\s*(?:[-:]\s*)?(.{0,120})$/i);
  if (!match) return null;

  const title = cleanTitle(match[2]);
  return {
    sectionRef: cleanSectionRef(match[1]),
    title: title || cleanSectionRef(match[1])
  };
}

function detectNumberedHeading(line: string): HeadingMatch | null {
  const match = line.match(/^((?:\d+|[A-Z])(?:\.\d+)*\.?)\s+(.{3,120})$/);
  if (!match) return null;

  const title = cleanTitle(match[2]);
  if (!looksLikeHeadingTitle(title)) return null;

  return {
    sectionRef: cleanSectionRef(match[1]),
    title
  };
}

function detectAllCapsHeading(line: string): HeadingMatch | null {
  if (line.length < 4 || line.length > 90) return null;
  if (/[.!?]$/.test(line)) return null;
  if (!/[A-Z]/.test(line)) return null;
  if (line !== line.toUpperCase()) return null;
  if (!/^[A-Z0-9 &,/'()\-]+$/.test(line)) return null;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length > 10) return null;

  return {
    sectionRef: "Section unknown",
    title: cleanTitle(line)
  };
}

function looksLikeHeadingTitle(title: string) {
  if (!title) return false;
  if (title.length > 120) return false;
  if (title.split(/\s+/).length > 14) return false;
  return !/[.!?]$/.test(title);
}

function cleanSectionRef(value: string) {
  return value.replace(/\s+/g, " ").trim() || "Section unknown";
}

function cleanTitle(value: string) {
  return value.replace(/^[\s:.\-]+/, "").replace(/\s+/g, " ").trim() || "Untitled clause";
}

function formatClauseId(order: number) {
  return `CL-${String(order).padStart(3, "0")}`;
}
