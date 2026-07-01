const { execFileSync } = require("child_process");
const fs = require("fs");

const INGEST_SCRIPT_PATH = "scripts/ingest-knowledge.cjs";
const INGEST_HELPER_PATH = "lib/rag/ingest-knowledge.ts";
const RAG_DB_HELPER_PATH = "lib/rag/db.ts";
const RAG_EMBED_QUERY_HELPER_PATH = "lib/rag/embed-query.ts";
const PACKAGE_PATH = "package.json";

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) {
    throw new Error(`${message}: expected to include ${expected}`);
  }
}

function assertNotMatches(value, pattern, message) {
  if (pattern.test(value)) {
    throw new Error(message);
  }
}

function collectSourceFiles(paths) {
  const files = [];

  paths.forEach((path) => {
    if (!fs.existsSync(path)) return;
    const stat = fs.statSync(path);

    if (stat.isFile()) {
      files.push(path);
      return;
    }

    fs.readdirSync(path, { withFileTypes: true }).forEach((entry) => {
      if (entry.name === "node_modules" || entry.name === ".next") return;
      const childPath = `${path}/${entry.name}`;

      if (entry.isDirectory()) {
        files.push(...collectSourceFiles([childPath]));
      } else if (/\.(ts|tsx|cjs|json|sql)$/.test(entry.name)) {
        files.push(childPath);
      }
    });
  });

  return files;
}

function assertNoPatternInFiles(files, pattern, message) {
  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assertNotMatches(source, pattern, `${message}: ${file}`);
  });
}

assertTruthy(fs.existsSync(INGEST_SCRIPT_PATH), "Knowledge ingest script: script exists");

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
assertTruthy(packageJson.scripts["ingest:knowledge"], "Knowledge ingest script: ingest:knowledge script exists");
assertTruthy(packageJson.scripts["ingest:knowledge:dry-run"], "Knowledge ingest script: dry-run script exists");

const scriptSource = fs.readFileSync(INGEST_SCRIPT_PATH, "utf8");
const helperSource = fs.readFileSync(INGEST_HELPER_PATH, "utf8");

assertIncludes(scriptSource, "const LIVE_FLAG = \"--live\"", "Knowledge ingest script: live flag is explicit");
assertIncludes(scriptSource, "const DRY_RUN_FLAG = \"--dry-run\"", "Knowledge ingest script: dry-run flag exists");
assertIncludes(scriptSource, "const isDryRun = !isLive", "Knowledge ingest script: dry-run is default");
assertIncludes(scriptSource, "require(\"@next/env\")", "Knowledge ingest script: Next env loader is used");
assertIncludes(scriptSource, "loadEnvConfig(process.cwd())", "Knowledge ingest script: .env.local is loaded before env reads");
assertIncludes(scriptSource, "runIngestReadyProbe", "Knowledge ingest script: live mode runs readiness probe");
assertIncludes(scriptSource, "scripts/probe-knowledge-ingest-ready.cjs", "Knowledge ingest script: live mode requires ingest-ready validation");
assertIncludes(scriptSource, "RAG_DATABASE_URL", "Knowledge ingest script: RAG_DATABASE_URL is referenced");
assertIncludes(scriptSource, "OPENAI_API_KEY", "Knowledge ingest script: OPENAI_API_KEY is referenced");
assertIncludes(scriptSource, "OPENAI_EMBEDDING_MODEL", "Knowledge ingest script: OPENAI_EMBEDDING_MODEL is referenced");
assertIncludes(scriptSource, "text-embedding-3-small", "Knowledge ingest script: OpenAI embedding model default is documented");
assertIncludes(scriptSource, "EMBEDDING_BATCH_SIZE", "Knowledge ingest script: embedding batching exists");
assertIncludes(scriptSource, "content_hash", "Knowledge ingest script: content hash skip logic exists");
assertIncludes(scriptSource, "rag_ingest_runs", "Knowledge ingest script: ingest runs are written in live mode");
assertIncludes(scriptSource, "rag_knowledge_documents", "Knowledge ingest script: documents are upserted in live mode");
assertIncludes(scriptSource, "rag_knowledge_chunks", "Knowledge ingest script: chunks are upserted in live mode");

assertNotMatches(scriptSource, /sk-[A-Za-z0-9_-]{12,}/, "Knowledge ingest script: no OpenAI secret is hard-coded");
assertNotMatches(scriptSource, /postgres(?:ql)?:\/\/[^"'\s]+/i, "Knowledge ingest script: no database URL is hard-coded");

[
  "collection-aware section-based chunks",
  "collection-aware risk-rule and taxonomy-concept chunks",
  "collection-aware clause-guidance chunks",
  "collection-aware negotiation-rule chunks",
  "collection-aware checklist-rule chunks",
  "collection-aware control-group chunks",
  "collection-aware privacy and data-governance control chunks",
  "collection-aware vendor-governance chunks",
  "semanticChunkStrategy",
  "semanticSectionTitle"
].forEach((expected) => {
  assertIncludes(helperSource, expected, `Knowledge ingest helper: ${expected} is implemented`);
});

assertTruthy(
  helperSource.indexOf("buildSemanticChunkUnits") < helperSource.indexOf("splitContentIntoChunks(seedDocument.content"),
  "Knowledge ingest helper: semantic chunking is primary and token limits are fallback"
);

execFileSync(process.execPath, [INGEST_SCRIPT_PATH, "--dry-run"], {
  stdio: "pipe",
  windowsHide: true
});

[
  "lib/rag/retriever.ts",
  "lib/rag/router.ts",
  "lib/rag/context-builder.ts"
].forEach((file) => {
  assertTruthy(!fs.existsSync(file), `Knowledge ingest script: ${file} was not added`);
});

const runtimeFiles = collectSourceFiles(["app", "components", "lib", "schemas", "types"]).filter(
  (file) => file !== INGEST_HELPER_PATH && file !== RAG_DB_HELPER_PATH && file !== RAG_EMBED_QUERY_HELPER_PATH
);
assertNoPatternInFiles(runtimeFiles, /\bretrieveKnowledge\b|\bretrieveRagContext\b/i, "Knowledge ingest script: retrieval functions are absent from runtime");
assertNoPatternInFiles(
  runtimeFiles,
  /embedding\s*(<=>|<#>|<->)|order\s+by\s+[^;]*embedding|similarity\s+search|similaritySearch/i,
  "Knowledge ingest script: runtime vector search behavior is absent"
);
assertNoPatternInFiles(
  runtimeFiles,
  /from\s+["']pg["']|require\(["']pg["']\)|@supabase\/supabase-js|new\s+(Pool|Client)\b|postgres\(|createClient\(/i,
  "Knowledge ingest script: runtime database client usage is absent"
);

console.log("Knowledge ingest script probes passed.");
