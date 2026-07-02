const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const SAMPLE_QUERIES = [
  "unrestricted AI model training rights",
  "unlimited liability exposure",
  "breach notification obligations",
  "subprocessor disclosure",
  "transition assistance"
];

const moduleCache = new Map();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for live RAG retriever smoke testing.`);
  }
  return value;
}

function resolveTsModulePath(fromPath, id) {
  if (!id.startsWith(".")) return null;

  const basePath = path.resolve(path.dirname(fromPath), id);
  const candidates = [`${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, "index.ts")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function createTsRequire(fromPath) {
  return (id) => {
    const resolvedTsPath = resolveTsModulePath(fromPath, id);
    if (resolvedTsPath) {
      return loadTsModule(path.relative(process.cwd(), resolvedTsPath));
    }
    return require(id);
  };
}

function loadTsModule(filePath) {
  const normalizedPath = path.normalize(filePath);
  if (moduleCache.has(normalizedPath)) {
    return moduleCache.get(normalizedPath);
  }

  const absolutePath = path.resolve(process.cwd(), normalizedPath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const mod = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  moduleCache.set(normalizedPath, mod.exports);
  new Function("require", "module", "exports", code)(createTsRequire(absolutePath), mod, mod.exports);
  return mod.exports;
}

function previewContent(content) {
  return content.replace(/\s+/g, " ").trim().slice(0, 220);
}

function formatTags(tags) {
  return Array.isArray(tags) && tags.length > 0 ? tags.join(", ") : "(none)";
}

async function main() {
  requireEnv("RAG_DATABASE_URL");
  requireEnv("OPENAI_API_KEY");

  console.log("Live RAG retriever smoke test.");
  console.log("This will call OpenAI embeddings and query Supabase/Postgres pgvector data.");
  console.log("Secrets are required from the environment but will not be printed.");

  const { retrieveKnowledge } = loadTsModule("lib/rag/retriever.ts");

  for (const queryText of SAMPLE_QUERIES) {
    const response = await retrieveKnowledge({
      id: `live-smoke-${queryText.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      queryText,
      intent: "live_smoke_test",
      topK: 6,
      minSimilarity: 0.72,
      filters: {}
    });

    console.log("");
    console.log(`Query: ${queryText}`);
    console.log(`Retrieved chunks: ${response.retrievedChunkCount}`);
    console.log(`Keyword fallback triggered: ${Boolean(response.metadata?.keywordFallbackTriggered)}`);

    response.results.slice(0, 5).forEach((result, index) => {
      const reference = result.kbReference;
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   collection: ${result.collection}`);
      console.log(`   similarityScore: ${result.similarityScore.toFixed(4)}`);
      console.log(`   governanceArea: ${reference.governanceArea ?? "(none)"}`);
      console.log(`   retrievalTags: ${formatTags(reference.retrievalTags)}`);
      console.log(`   preview: ${previewContent(result.content)}`);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
