const fs = require("fs");

const DB_HELPER_PATH = "lib/rag/db.ts";
const EMBED_HELPER_PATH = "lib/rag/embed-query.ts";
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
      } else if (/\.(ts|tsx|cjs|json)$/.test(entry.name)) {
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

assertTruthy(fs.existsSync(DB_HELPER_PATH), "RAG infra: DB helper exists");
assertTruthy(fs.existsSync(EMBED_HELPER_PATH), "RAG infra: query embedding helper exists");

const dbSource = fs.readFileSync(DB_HELPER_PATH, "utf8");
const embedSource = fs.readFileSync(EMBED_HELPER_PATH, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));

assertTruthy(packageJson.scripts["probe:rag-infra"], "RAG infra: package script exists");

assertIncludes(dbSource, "createRagPostgresPool", "RAG infra: DB helper exports pool factory");
assertIncludes(dbSource, "RAG_DATABASE_URL", "RAG infra: RAG_DATABASE_URL is referenced");
assertIncludes(dbSource, "require(\"pg\")", "RAG infra: pg dependency is loaded only by helper");
assertIncludes(dbSource, "typeof window", "RAG infra: DB helper has server runtime guard");
assertIncludes(dbSource, "does not connect to Postgres", "RAG infra: DB helper documents no import-time connection");
assertNotMatches(dbSource, /postgres(?:ql)?:\/\/[^"'\s]+/i, "RAG infra: database URL is not hard-coded");
assertNotMatches(dbSource, /\.connect\(/, "RAG infra: DB helper does not connect eagerly");
assertNotMatches(dbSource, /console\.(log|warn|error)/, "RAG infra: DB helper does not print secrets");

assertIncludes(embedSource, "embedRetrievalQueryText", "RAG infra: query embedding function is exported");
assertIncludes(embedSource, "OPENAI_API_KEY", "RAG infra: OPENAI_API_KEY is referenced");
assertIncludes(embedSource, "OPENAI_EMBEDDING_MODEL", "RAG infra: OPENAI_EMBEDDING_MODEL is referenced");
assertIncludes(embedSource, "text-embedding-3-small", "RAG infra: default embedding model is text-embedding-3-small");
assertIncludes(embedSource, "QUERY_EMBEDDING_DIMENSIONS = 1536", "RAG infra: query embedding dimension is 1536");
assertIncludes(embedSource, "validateQueryEmbeddingDimension", "RAG infra: embedding dimension validation exists");
assertIncludes(embedSource, "typeof window", "RAG infra: embedding helper has server runtime guard");
assertNotMatches(embedSource, /sk-[A-Za-z0-9_-]{12,}/, "RAG infra: OpenAI key is not hard-coded");
assertNotMatches(embedSource, /embedding\s*(<=>|<#>|<->)|order\s+by\s+[^;]*embedding|similaritySearch/i, "RAG infra: embedding helper does not execute vector search");
assertNotMatches(embedSource, /\bretrieveKnowledge\b|\bretrieveRagContext\b/i, "RAG infra: embedding helper does not add retriever behavior");
assertNotMatches(embedSource, /console\.(log|warn|error)/, "RAG infra: embedding helper does not print secrets");

[
  "lib/rag/router.ts",
  "lib/rag/context-builder.ts"
].forEach((path) => {
  assertTruthy(!fs.existsSync(path), `RAG infra: ${path} was not added`);
});

const runtimeWiringFiles = collectSourceFiles([
  "app",
  "components",
  "lib/ai",
  "lib/reporting",
  "schemas",
  "types"
]);
assertNoPatternInFiles(runtimeWiringFiles, /@\/lib\/rag\/(db|embed-query)|lib\/rag\/(db|embed-query)/, "RAG infra: helpers are not wired into runtime surfaces");
assertNoPatternInFiles(runtimeWiringFiles, /\bretrieveKnowledge\b|\bretrieveRagContext\b/i, "RAG infra: retrieval functions are absent from runtime surfaces");
assertNoPatternInFiles(runtimeWiringFiles, /embedding\s*(<=>|<#>|<->)|order\s+by\s+[^;]*embedding|similaritySearch/i, "RAG infra: vector search is absent from runtime surfaces");

console.log("RAG infrastructure helper probes passed.");
