const { execFileSync } = require("child_process");
const ts = require("typescript");
const fs = require("fs");

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;
const DRY_RUN_FLAG = "--dry-run";
const LIVE_FLAG = "--live";

const args = process.argv.slice(2);
const isLive = args.includes(LIVE_FLAG);
const isDryRun = !isLive || args.includes(DRY_RUN_FLAG);
const moduleCache = new Map();

const seedFileByCollection = {
  company_profile: "lib/rag/seed/company-profile.ts",
  risk_taxonomy: "lib/rag/seed/risk-taxonomy.ts",
  contract_review_playbook: "lib/rag/seed/contract-review-playbook.ts",
  contract_review_checklist: "lib/rag/seed/contract-review-checklist.ts",
  security_compliance_standards: "lib/rag/seed/security-compliance-standards.ts",
  clause_library: "lib/rag/seed/clause-library.ts",
  procurement_policy: "lib/rag/seed/procurement-policy.ts",
  privacy_data_governance_standards: "lib/rag/seed/privacy-data-governance-standards.ts"
};

function loadTsModule(path, localRequire = require, useCache = true) {
  if (useCache && moduleCache.has(path)) {
    return moduleCache.get(path);
  }

  const mod = { exports: {} };
  const source = fs.readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
  if (useCache) {
    moduleCache.set(path, mod.exports);
  }
  return mod.exports;
}

function loadKnowledgeTypes() {
  return loadTsModule("lib/rag/knowledge-types.ts");
}

function createSeedRequire(knowledgeTypes) {
  return (id) => {
    if (id === "../knowledge-types") return knowledgeTypes;
    if (id === "./company-profile") return loadTsModule(seedFileByCollection.company_profile, createSeedRequire(knowledgeTypes));
    if (id === "./risk-taxonomy") return loadTsModule(seedFileByCollection.risk_taxonomy, createSeedRequire(knowledgeTypes));
    if (id === "./contract-review-playbook") return loadTsModule(seedFileByCollection.contract_review_playbook, createSeedRequire(knowledgeTypes));
    if (id === "./contract-review-checklist") return loadTsModule(seedFileByCollection.contract_review_checklist, createSeedRequire(knowledgeTypes));
    if (id === "./security-compliance-standards") {
      return loadTsModule(seedFileByCollection.security_compliance_standards, createSeedRequire(knowledgeTypes));
    }
    if (id === "./clause-library") return loadTsModule(seedFileByCollection.clause_library, createSeedRequire(knowledgeTypes));
    if (id === "./procurement-policy") return loadTsModule(seedFileByCollection.procurement_policy, createSeedRequire(knowledgeTypes));
    if (id === "./privacy-data-governance-standards") {
      return loadTsModule(seedFileByCollection.privacy_data_governance_standards, createSeedRequire(knowledgeTypes));
    }
    return require(id);
  };
}

function loadSeedIndex(knowledgeTypes) {
  return loadTsModule("lib/rag/seed/index.ts", createSeedRequire(knowledgeTypes));
}

function createIngestRequire(knowledgeTypes, seedIndex) {
  return (id) => {
    if (id === "./knowledge-types") return knowledgeTypes;
    if (id === "./seed") return seedIndex;
    return require(id);
  };
}

function loadIngestModules() {
  const knowledgeTypes = loadKnowledgeTypes();
  const seedIndex = loadSeedIndex(knowledgeTypes);
  const ingest = loadTsModule("lib/rag/ingest-knowledge.ts", createIngestRequire(knowledgeTypes, seedIndex));
  return { ingest, knowledgeTypes, seedIndex };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for live knowledge ingestion`);
  }
  return value;
}

function requireLiveDependency(name, installHint) {
  try {
    return require(name);
  } catch (error) {
    throw new Error(`${name} is required for live knowledge ingestion. ${installHint}`);
  }
}

function summarizePreparedIngest(prepared) {
  const documentsByReadiness = prepared.documents.reduce(
    (summary, document) => {
      summary[document.ingestReady ? "ready" : "blocked"] += 1;
      return summary;
    },
    { ready: 0, blocked: 0 }
  );
  const chunksByCollection = prepared.chunks.reduce((summary, chunk) => {
    summary[chunk.collection] = (summary[chunk.collection] ?? 0) + 1;
    return summary;
  }, {});

  console.log(`Mode: ${isLive ? "live" : "dry-run"}`);
  console.log(`Documents: ${prepared.documents.length}`);
  console.log(`Chunks: ${prepared.chunks.length}`);
  console.log(`Ingest-ready documents: ${documentsByReadiness.ready}`);
  console.log(`Blocked documents: ${documentsByReadiness.blocked}`);
  console.log("Collection-aware semantic chunks:");
  Object.keys(chunksByCollection).sort().forEach((collection) => {
    console.log(`- ${collection}: ${chunksByCollection[collection]} chunks`);
  });
  console.log("Document readiness:");
  prepared.documents.forEach((document) => {
    console.log(`- ${document.id}: ingestReady=${document.ingestReady}`);
  });
}

function runIngestReadyProbe() {
  execFileSync(process.execPath, ["scripts/probe-knowledge-ingest-ready.cjs"], {
    stdio: "inherit",
    windowsHide: true
  });
}

function createVectorLiteral(values) {
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding vector contains a non-finite value");
    }
    return String(value);
  }).join(",")}]`;
}

function batchItems(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function createEmbeddings(openai, model, chunks) {
  const embeddingsByChunkId = new Map();

  for (const batch of batchItems(chunks, EMBEDDING_BATCH_SIZE)) {
    const response = await openai.embeddings.create({
      model,
      input: batch.map((chunk) => chunk.content)
    });

    response.data.forEach((item, index) => {
      const embedding = item.embedding;
      if (!Array.isArray(embedding) || embedding.length !== 1536) {
        throw new Error(`Embedding dimension mismatch for ${batch[index].id}: expected 1536`);
      }
      embeddingsByChunkId.set(batch[index].id, embedding);
    });
  }

  return embeddingsByChunkId;
}

async function upsertDocuments(client, documents) {
  for (const document of documents) {
    await client.query(
      `INSERT INTO rag_knowledge_documents (
        id, collection, title, source_type, version, tags, metadata, content_hash, ingest_ready, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, now())
      ON CONFLICT (id) DO UPDATE SET
        collection = EXCLUDED.collection,
        title = EXCLUDED.title,
        source_type = EXCLUDED.source_type,
        version = EXCLUDED.version,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        content_hash = EXCLUDED.content_hash,
        ingest_ready = EXCLUDED.ingest_ready,
        updated_at = now()`,
      [
        document.id,
        document.collection,
        document.title,
        document.sourceType,
        document.version,
        JSON.stringify(document.tags),
        JSON.stringify(document.metadata),
        document.contentHash,
        document.ingestReady
      ]
    );
  }
}

async function getUnchangedChunkIds(client, chunks) {
  if (chunks.length === 0) return new Set();
  const result = await client.query(
    "SELECT id, content_hash FROM rag_knowledge_chunks WHERE id = ANY($1)",
    [chunks.map((chunk) => chunk.id)]
  );
  const existingHashes = new Map(result.rows.map((row) => [row.id, row.content_hash]));
  return new Set(chunks.filter((chunk) => existingHashes.get(chunk.id) === chunk.contentHash).map((chunk) => chunk.id));
}

async function upsertChangedChunks(client, chunks, embeddingsByChunkId) {
  for (const chunk of chunks) {
    const embedding = embeddingsByChunkId.get(chunk.id);
    if (!embedding) {
      throw new Error(`Missing embedding for changed chunk ${chunk.id}`);
    }

    await client.query(
      `INSERT INTO rag_knowledge_chunks (
        id, document_id, collection, chunk_index, title, content, content_hash,
        token_estimate, tags, metadata, embedding, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::vector, now())
      ON CONFLICT (id) DO UPDATE SET
        document_id = EXCLUDED.document_id,
        collection = EXCLUDED.collection,
        chunk_index = EXCLUDED.chunk_index,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        content_hash = EXCLUDED.content_hash,
        token_estimate = EXCLUDED.token_estimate,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding,
        updated_at = now()`,
      [
        chunk.id,
        chunk.documentId,
        chunk.collection,
        chunk.chunkIndex,
        chunk.title,
        chunk.content,
        chunk.contentHash,
        chunk.tokenEstimate,
        JSON.stringify(chunk.tags),
        JSON.stringify(chunk.metadata),
        createVectorLiteral(embedding)
      ]
    );
  }
}

async function runLiveIngestion(prepared) {
  runIngestReadyProbe();

  const databaseUrl = requireEnv("RAG_DATABASE_URL");
  const openAiApiKey = requireEnv("OPENAI_API_KEY");
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  if (embeddingModel !== DEFAULT_EMBEDDING_MODEL) {
    throw new Error(`OPENAI_EMBEDDING_MODEL must be ${DEFAULT_EMBEDDING_MODEL} for vector(1536) compatibility`);
  }

  const OpenAIModule = requireLiveDependency("openai", "Install project dependencies before live mode.");
  const { Client } = requireLiveDependency("pg", "Run npm install pg before live mode.");
  const OpenAI = OpenAIModule.default ?? OpenAIModule;
  const openai = new OpenAI({ apiKey: openAiApiKey });
  const client = new Client({ connectionString: databaseUrl });
  const runId = `rag-ingest-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO rag_ingest_runs (id, status, source, document_count, chunk_count, metadata)
       VALUES ($1, 'running', 'knowledge_seed', $2, $3, $4::jsonb)`,
      [
        runId,
        prepared.documents.length,
        prepared.chunks.length,
        JSON.stringify({
          dryRunDefault: true,
          embeddingBatchSize: EMBEDDING_BATCH_SIZE,
          embeddingModel,
          liveFlagRequired: LIVE_FLAG
        })
      ]
    );

    await upsertDocuments(client, prepared.documents);
    const unchangedChunkIds = await getUnchangedChunkIds(client, prepared.chunks);
    const changedChunks = prepared.chunks.filter((chunk) => !unchangedChunkIds.has(chunk.id));
    const embeddingsByChunkId = await createEmbeddings(openai, embeddingModel, changedChunks);
    await upsertChangedChunks(client, changedChunks, embeddingsByChunkId);

    await client.query(
      `UPDATE rag_ingest_runs
       SET status = 'completed',
           completed_at = now(),
           metadata = metadata || $2::jsonb
       WHERE id = $1`,
      [
        runId,
        JSON.stringify({
          changedChunkCount: changedChunks.length,
          skippedUnchangedChunkCount: unchangedChunkIds.size
        })
      ]
    );
    await client.query("COMMIT");

    console.log(`Live knowledge ingestion completed: ${runId}`);
    console.log(`Changed chunks embedded/upserted: ${changedChunks.length}`);
    console.log(`Unchanged chunks skipped: ${unchangedChunkIds.size}`);
  } catch (error) {
    await client.query("ROLLBACK");
    try {
      await client.query(
        `INSERT INTO rag_ingest_runs (id, status, source, document_count, chunk_count, error, completed_at, metadata)
         VALUES ($1, 'failed', 'knowledge_seed', $2, $3, $4, now(), $5::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           status = 'failed',
           error = EXCLUDED.error,
           completed_at = now(),
           metadata = rag_ingest_runs.metadata || EXCLUDED.metadata`,
        [
          runId,
          prepared.documents.length,
          prepared.chunks.length,
          error instanceof Error ? error.message : String(error),
          JSON.stringify({ embeddingModel })
        ]
      );
    } catch (_runError) {
      // Preserve the original live ingestion error.
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const { ingest, seedIndex } = loadIngestModules();
  const validation = ingest.validateKnowledgeSeedDocuments(seedIndex.KNOWLEDGE_SEED_DOCUMENTS);
  if (!validation.valid) {
    throw new Error(`Knowledge seed validation failed: ${validation.errors.join("; ")}`);
  }

  const prepared = ingest.buildKnowledgeIngestRecords(seedIndex.KNOWLEDGE_SEED_DOCUMENTS);
  summarizePreparedIngest(prepared);

  if (isDryRun) {
    console.log("Dry-run complete. No database connection, OpenAI call, or external write was performed.");
    if (!isLive) {
      console.log(`Use ${LIVE_FLAG} only after knowledge seeds are explicitly approved for ingestion.`);
    }
    return;
  }

  await runLiveIngestion(prepared);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
