import { KB_COLLECTIONS, isKBCollection, type KBCollection, type KBSeedDocument } from "./knowledge-types";
import { getKnowledgeSeedDocuments } from "./seed";

const DEFAULT_CHUNK_MAX_CHARS = 2200;

export type IngestKnowledgeDocumentRecord = {
  id: string;
  collection: KBCollection;
  title: string;
  sourceType: KBSeedDocument["sourceType"];
  version: string;
  tags: string[];
  metadata: Record<string, unknown>;
  contentHash: string;
  ingestReady: boolean;
};

export type IngestKnowledgeChunkRecord = {
  id: string;
  documentId: string;
  collection: KBCollection;
  chunkIndex: number;
  title: string;
  content: string;
  contentHash: string;
  tokenEstimate: number;
  tags: string[];
  metadata: Record<string, unknown>;
};

export type PreparedKnowledgeIngest = {
  documents: IngestKnowledgeDocumentRecord[];
  chunks: IngestKnowledgeChunkRecord[];
};

export type KnowledgeSeedValidationResult = {
  valid: boolean;
  errors: string[];
};

type ChunkingOptions = {
  maxChars?: number;
};

type SemanticChunkUnit = {
  title: string;
  content: string;
  metadata: Record<string, unknown>;
};

type CollectionChunkingRule = {
  strategy: string;
  chunkType: string;
};

const COLLECTION_CHUNKING_RULES: Record<KBCollection, CollectionChunkingRule> = {
  company_profile: {
    strategy: "collection-aware section-based chunks for major company context sections",
    chunkType: "company_profile"
  },
  risk_taxonomy: {
    strategy: "collection-aware risk-rule and taxonomy-concept chunks",
    chunkType: "risk_taxonomy"
  },
  contract_review_playbook: {
    strategy: "collection-aware negotiation-rule chunks",
    chunkType: "playbook"
  },
  contract_review_checklist: {
    strategy: "collection-aware checklist-rule chunks",
    chunkType: "checklist"
  },
  security_compliance_standards: {
    strategy: "collection-aware control-group chunks",
    chunkType: "standard"
  },
  clause_library: {
    strategy: "collection-aware clause-guidance chunks",
    chunkType: "clause_guidance"
  },
  procurement_policy: {
    strategy: "collection-aware vendor-governance chunks",
    chunkType: "policy"
  },
  privacy_data_governance_standards: {
    strategy: "collection-aware privacy and data-governance control chunks",
    chunkType: "standard"
  }
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createStableContentHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function estimateTokenCount(content: string): number {
  const normalized = normalizeWhitespace(content);
  return normalized ? Math.ceil(normalized.length / 4) : 0;
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? uniqueSortedStrings(value.filter((item): item is string => typeof item === "string")) : [];
}

function validateMetadata(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSerializableMetadataValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every(isSerializableMetadataValue);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isSerializableMetadataValue);
  }
  return false;
}

export function validateKnowledgeSeedDocuments(
  seedDocuments: readonly KBSeedDocument[] = getKnowledgeSeedDocuments()
): KnowledgeSeedValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  seedDocuments.forEach((document, index) => {
    const label = document.id || `seed[${index}]`;

    if (!document.id || !document.id.trim()) {
      errors.push(`${label}: id is required`);
    } else if (seenIds.has(document.id)) {
      errors.push(`${label}: duplicate id`);
    }
    seenIds.add(document.id);

    if (!isKBCollection(document.collection)) {
      errors.push(`${label}: collection is not a known KB collection`);
    }
    if (!document.title || !document.title.trim()) {
      errors.push(`${label}: title is required`);
    }
    if (!document.version || !document.version.trim()) {
      errors.push(`${label}: version is required`);
    }
    if (!document.content || !document.content.trim()) {
      errors.push(`${label}: content is required`);
    }
    if (!Array.isArray(document.tags)) {
      errors.push(`${label}: tags must be an array`);
    }
    if (!validateMetadata(document.metadata)) {
      errors.push(`${label}: metadata must be an object`);
    } else if (!isSerializableMetadataValue(document.metadata)) {
      errors.push(`${label}: metadata must be JSON-serializable`);
    }
    if (typeof document.ingestReady !== "boolean") {
      errors.push(`${label}: ingestReady must be boolean`);
    }
  });

  KB_COLLECTIONS.forEach((collection) => {
    if (!seedDocuments.some((document) => document.collection === collection)) {
      errors.push(`${collection}: collection has no seed document`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function toIngestDocumentRecord(seedDocument: KBSeedDocument): IngestKnowledgeDocumentRecord {
  const tags = uniqueSortedStrings(seedDocument.tags);
  const metadata = { ...seedDocument.metadata };
  const normalizedContent = normalizeWhitespace(seedDocument.content);

  return {
    id: seedDocument.id,
    collection: seedDocument.collection,
    title: seedDocument.title.trim(),
    sourceType: seedDocument.sourceType,
    version: seedDocument.version.trim(),
    tags,
    metadata,
    contentHash: createStableContentHash({
      collection: seedDocument.collection,
      content: normalizedContent,
      id: seedDocument.id,
      metadata,
      sourceType: seedDocument.sourceType,
      tags,
      title: seedDocument.title.trim(),
      version: seedDocument.version.trim()
    }),
    ingestReady: seedDocument.ingestReady
  };
}

function splitContentIntoChunks(content: string, options: ChunkingOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_MAX_CHARS;
  const paragraphs = normalizeWhitespace(content)
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  paragraphs.forEach((paragraph) => {
    if (!current) {
      current = paragraph;
      return;
    }

    if (`${current}\n\n${paragraph}`.length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      return;
    }

    chunks.push(current);
    current = paragraph;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks.length > 0 ? chunks : [normalizeWhitespace(content)];
}

function isSemanticHeading(line: string): boolean {
  const normalized = line.trim();
  if (!normalized || normalized.length > 90) return false;
  if (/^(?:\d+\.|[-*]|â€¢|•)\s/.test(normalized)) return false;
  if (/[.!?]$/.test(normalized)) return false;
  if (normalized.includes(":") && !/^(Examples|Example|Generally Required|Recommended|Elevated Review|Preferred Position|Fallback Position)$/i.test(normalized)) {
    return false;
  }

  return /^[A-Z0-9][A-Za-z0-9&/() -]+$/.test(normalized);
}

function firstHeadingLine(block: string): string | undefined {
  const firstLine = block.split("\n").map((line) => line.trim()).find(Boolean);
  return firstLine && isSemanticHeading(firstLine) ? firstLine : undefined;
}

function isDocumentTitleBlock(block: string): boolean {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length === 1 && /Northstar Cloud Intelligence \(NCI\)/.test(lines[0]);
}

function shouldUseParentHeading(block: string, collection: KBCollection): boolean {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1 || !isSemanticHeading(lines[0])) return false;

  const heading = lines[0];
  const parentHeadingsByCollection: Record<KBCollection, string[]> = {
    company_profile: ["Product Portfolio"],
    risk_taxonomy: ["Risk Domains", "Common Enterprise Risk Patterns"],
    contract_review_playbook: [
      "Preferred Contract Positions",
      "Red Flag Indicators",
      "Gap Prioritization Guidance",
      "Agreement-Type Guidance",
      "Recommendation Styles"
    ],
    contract_review_checklist: [
      "NDA Checklist",
      "SaaS Agreement Checklist",
      "Master Services Agreement (MSA) Checklist",
      "Vendor Agreement Checklist",
      "Data Processing Agreement (DPA) Checklist",
      "Gap Types"
    ],
    security_compliance_standards: [
      "Security Governance Standards",
      "Data Protection Standards",
      "Security Gap Types",
      "Security & Compliance Risk Indicators"
    ],
    clause_library: [
      "Confidentiality Guidance",
      "Liability Guidance",
      "Payment & Commercial Guidance",
      "Security & Data Protection Guidance",
      "Intellectual Property Guidance",
      "Operational Governance Guidance",
      "Audit & Compliance Guidance",
      "AI Governance Guidance",
      "Agreement-Type Priorities"
    ],
    procurement_policy: [
      "Vendor Criticality Classification",
      "Vendor Governance Standards",
      "Procurement Escalation Guidance",
      "Contract Acceptance Guidance",
      "Procurement Risk & Gap Interpretation"
    ],
    privacy_data_governance_standards: [
      "AI & Derived Data Governance",
      "Retention & Deletion Standards",
      "Subprocessor Data Governance",
      "Privacy & Data Governance Risk & Gap Interpretation",
      "Data Governance Risk Prioritization Matrix"
    ]
  };

  return parentHeadingsByCollection[collection].includes(heading);
}

function splitLongSemanticUnit(unit: SemanticChunkUnit, maxChars: number): SemanticChunkUnit[] {
  if (unit.content.length <= maxChars) return [unit];

  return splitContentIntoChunks(unit.content, { maxChars }).map((content, index) => ({
    title: `${unit.title} - Part ${index + 1}`,
    content,
    metadata: {
      ...unit.metadata,
      semanticSectionTitle: `${unit.title} - Part ${index + 1}`,
      semanticSplitFallback: true
    }
  }));
}

function buildSemanticChunkUnits(seedDocument: KBSeedDocument, options: ChunkingOptions = {}): SemanticChunkUnit[] {
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_MAX_CHARS;
  const rule = COLLECTION_CHUNKING_RULES[seedDocument.collection];
  const chunkPreparation = seedDocument.metadata.chunkPreparation ?? {};
  const blocks = normalizeWhitespace(seedDocument.content)
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const units: SemanticChunkUnit[] = [];
  let parentHeading = "";

  blocks.forEach((block) => {
    if (isDocumentTitleBlock(block)) return;

    if (shouldUseParentHeading(block, seedDocument.collection)) {
      parentHeading = block.trim();
      return;
    }

    const heading = firstHeadingLine(block) ?? (parentHeading || seedDocument.title);
    const semanticSectionTitle = parentHeading && heading !== parentHeading ? `${parentHeading} - ${heading}` : heading;
    const content = parentHeading && heading !== parentHeading ? `${parentHeading}\n${block}` : block;
    const retrievalTags = uniqueSortedStrings([
      ...seedDocument.tags,
      ...toStringArray(chunkPreparation.retrievalTags),
      semanticSectionTitle
    ]);

    units.push({
      title: semanticSectionTitle,
      content,
      metadata: {
        chunkType: chunkPreparation.chunkType ?? rule.chunkType,
        collection: seedDocument.collection,
        contractTypes: toStringArray(chunkPreparation.contractTypes),
        governanceArea: chunkPreparation.governanceArea,
        primaryDomains: toStringArray(chunkPreparation.domains),
        retrievalTags,
        semanticChunkStrategy: rule.strategy,
        semanticSectionTitle,
        sourceDocumentTitle: seedDocument.title,
        sourceType: seedDocument.sourceType,
        version: seedDocument.version
      }
    });
  });

  const semanticUnits = units.length > 0
    ? units
    : splitContentIntoChunks(seedDocument.content, options).map((content, index) => ({
        title: `${seedDocument.title} - Fallback ${index + 1}`,
        content,
        metadata: {
          chunkType: chunkPreparation.chunkType ?? rule.chunkType,
          collection: seedDocument.collection,
          semanticChunkStrategy: `${rule.strategy}; token-limit fallback`,
          semanticSectionTitle: `${seedDocument.title} - Fallback ${index + 1}`,
          sourceDocumentTitle: seedDocument.title,
          sourceType: seedDocument.sourceType,
          version: seedDocument.version
        }
      }));

  return semanticUnits.flatMap((unit) => splitLongSemanticUnit(unit, maxChars));
}

export function toIngestChunkRecords(
  seedDocument: KBSeedDocument,
  options: ChunkingOptions = {}
): IngestKnowledgeChunkRecord[] {
  const documentRecord = toIngestDocumentRecord(seedDocument);
  const tags = [...documentRecord.tags];

  return buildSemanticChunkUnits(seedDocument, options).map((semanticUnit, chunkIndex) => {
    const chunkMetadata: Record<string, unknown> = {
      ...documentRecord.metadata,
      ...semanticUnit.metadata,
      collection: documentRecord.collection,
      documentVersion: documentRecord.version,
      seedMetadata: documentRecord.metadata,
      sourceDocument: {
        contentHash: documentRecord.contentHash,
        id: documentRecord.id,
        title: documentRecord.title
      },
      sourceType: documentRecord.sourceType,
      tags,
      version: documentRecord.version
    };

    return {
      id: `${documentRecord.id}::chunk-${String(chunkIndex).padStart(4, "0")}`,
      documentId: documentRecord.id,
      collection: documentRecord.collection,
      chunkIndex,
      title: `${documentRecord.title} - ${semanticUnit.title}`,
      content: semanticUnit.content,
      contentHash: createStableContentHash({
        collection: documentRecord.collection,
        content: semanticUnit.content,
        documentId: documentRecord.id,
        chunkIndex,
        semanticSectionTitle: semanticUnit.title,
        title: documentRecord.title
      }),
      tokenEstimate: estimateTokenCount(semanticUnit.content),
      tags,
      metadata: chunkMetadata
    };
  });
}

export function buildKnowledgeIngestRecords(
  seedDocuments: readonly KBSeedDocument[] = getKnowledgeSeedDocuments(),
  options: ChunkingOptions = {}
): PreparedKnowledgeIngest {
  const validation = validateKnowledgeSeedDocuments(seedDocuments);

  if (!validation.valid) {
    throw new Error(`Knowledge seed validation failed: ${validation.errors.join("; ")}`);
  }

  return {
    documents: seedDocuments.map(toIngestDocumentRecord),
    chunks: seedDocuments.flatMap((document) => toIngestChunkRecords(document, options))
  };
}
