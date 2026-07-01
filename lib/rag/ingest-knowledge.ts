import { KB_COLLECTIONS, isKBCollection, type KBCollection, type KBSeedDocument } from "./knowledge-types";
import { getKnowledgeSeedDocuments } from "./seed";

const DEFAULT_CHUNK_MAX_CHARS = 1200;

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

export function toIngestChunkRecords(
  seedDocument: KBSeedDocument,
  options: ChunkingOptions = {}
): IngestKnowledgeChunkRecord[] {
  const documentRecord = toIngestDocumentRecord(seedDocument);
  const tags = [...documentRecord.tags];

  return splitContentIntoChunks(seedDocument.content, options).map((content, chunkIndex) => {
    const chunkMetadata: Record<string, unknown> = {
      ...documentRecord.metadata,
      collection: documentRecord.collection,
      documentVersion: documentRecord.version,
      seedMetadata: documentRecord.metadata,
      sourceType: documentRecord.sourceType,
      tags,
      version: documentRecord.version
    };

    return {
      id: `${documentRecord.id}::chunk-${String(chunkIndex).padStart(4, "0")}`,
      documentId: documentRecord.id,
      collection: documentRecord.collection,
      chunkIndex,
      title: documentRecord.title,
      content,
      contentHash: createStableContentHash({
        collection: documentRecord.collection,
        content,
        documentId: documentRecord.id,
        chunkIndex,
        title: documentRecord.title
      }),
      tokenEstimate: estimateTokenCount(content),
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
