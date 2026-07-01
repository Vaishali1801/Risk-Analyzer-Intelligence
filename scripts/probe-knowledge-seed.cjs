const fs = require("fs");
const ts = require("typescript");

const moduleCache = new Map();

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

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) {
    throw new Error(`${message}: expected to include ${expected}`);
  }
}

function assertNotIncludes(value, expected, message) {
  if (value.includes(expected)) {
    throw new Error(`${message}: expected not to include ${expected}`);
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(`${message}: expected truthy value`);
  }
}

function assertFalse(value, message) {
  if (value !== false) {
    throw new Error(`${message}: expected false, received ${value}`);
  }
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(`${message}: expected array`);
  }
}

function assertSerializable(value, message) {
  JSON.stringify(value, (_key, item) => {
    if (typeof item === "undefined" || typeof item === "function" || typeof item === "symbol") {
      throw new Error(`${message}: metadata contains non-serializable value`);
    }
    return item;
  });
}

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

function loadKnowledgeTypes(useCache = true) {
  return loadTsModule("lib/rag/knowledge-types.ts", require, useCache);
}

function createSeedRequire(knowledgeTypes, useCache = true) {
  return (id) => {
    if (id === "../knowledge-types") return knowledgeTypes;
    if (id === "./company-profile") return loadTsModule(seedFileByCollection.company_profile, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./risk-taxonomy") return loadTsModule(seedFileByCollection.risk_taxonomy, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./contract-review-playbook") {
      return loadTsModule(seedFileByCollection.contract_review_playbook, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./contract-review-checklist") {
      return loadTsModule(seedFileByCollection.contract_review_checklist, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./security-compliance-standards") {
      return loadTsModule(seedFileByCollection.security_compliance_standards, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./clause-library") return loadTsModule(seedFileByCollection.clause_library, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./procurement-policy") return loadTsModule(seedFileByCollection.procurement_policy, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./privacy-data-governance-standards") {
      return loadTsModule(seedFileByCollection.privacy_data_governance_standards, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    return require(id);
  };
}

function loadSeedIndex(useCache = true) {
  const knowledgeTypes = loadKnowledgeTypes(useCache);
  return {
    knowledgeTypes,
    seedIndex: loadTsModule("lib/rag/seed/index.ts", createSeedRequire(knowledgeTypes, useCache), useCache)
  };
}

const { knowledgeTypes, seedIndex } = loadSeedIndex();
const { KB_COLLECTIONS, isKBCollection } = knowledgeTypes;
const {
  KNOWLEDGE_SEED_DOCUMENTS,
  KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION,
  getKnowledgeSeedDocuments
} = seedIndex;

const expectedSourceTypeByCollection = {
  company_profile: "manual_seed",
  risk_taxonomy: "approved_policy",
  contract_review_playbook: "approved_playbook",
  contract_review_checklist: "approved_policy",
  security_compliance_standards: "approved_policy",
  clause_library: "approved_clause_library",
  procurement_policy: "approved_policy",
  privacy_data_governance_standards: "approved_policy"
};

assertArray(KB_COLLECTIONS, "Knowledge seed: KB_COLLECTIONS is available");
assertArray(KNOWLEDGE_SEED_DOCUMENTS, "Knowledge seed: flattened seed documents are available");
assertTruthy(KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION, "Knowledge seed: seed map is available");
assertEqual(
  Object.keys(seedFileByCollection).length,
  KB_COLLECTIONS.length,
  "Knowledge seed: expected seed file map covers every collection"
);

KB_COLLECTIONS.forEach((collection) => {
  assertTruthy(fs.existsSync(seedFileByCollection[collection]), `Knowledge seed: seed file exists for ${collection}`);
  assertTruthy(isKBCollection(collection), `Knowledge seed: ${collection} is a valid KB collection`);

  const seedDocuments = KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION[collection];
  assertArray(seedDocuments, `Knowledge seed: ${collection} has seed array`);
  assertEqual(seedDocuments.length, 1, `Knowledge seed: ${collection} has exactly one seed document`);

  const seedSource = fs.readFileSync(seedFileByCollection[collection], "utf8");
  assertIncludes(seedSource, "KB_COLLECTIONS", `Knowledge seed: ${collection} seed module imports KB_COLLECTIONS`);
  assertTruthy(
    !/collection:\s*["']/.test(seedSource),
    `Knowledge seed: ${collection} seed module does not use string-literal collection assignment`
  );

  seedDocuments.forEach((document) => {
    assertEqual(document.collection, collection, `Knowledge seed: ${document.id} collection matches map key`);
    assertTruthy(KB_COLLECTIONS.includes(document.collection), `Knowledge seed: ${document.id} collection is from KB_COLLECTIONS`);
    assertTruthy(typeof document.id === "string" && document.id.trim(), `Knowledge seed: ${collection} item has id`);
    assertNotIncludes(document.id.toLowerCase(), "placeholder", `Knowledge seed: ${document.id} id is enterprise-ready`);
    assertTruthy(typeof document.title === "string" && document.title.trim(), `Knowledge seed: ${document.id} has title`);
    assertNotIncludes(document.title.toLowerCase(), "placeholder", `Knowledge seed: ${document.id} title is enterprise-ready`);
    assertTruthy(typeof document.content === "string" && document.content.trim(), `Knowledge seed: ${document.id} has content`);
    assertTruthy(document.content.length >= 1200, `Knowledge seed: ${document.id} contains substantial enterprise content`);
    assertNotIncludes(document.content.toLowerCase(), "placeholder", `Knowledge seed: ${document.id} content has no placeholder marker`);
    assertNotIncludes(document.content, "replace-with-approved-content", `Knowledge seed: ${document.id} content has no replacement marker`);
    assertTruthy(Object.prototype.hasOwnProperty.call(document, "ingestReady"), `Knowledge seed: ${document.id} has top-level ingestReady`);
    assertTruthy(document.ingestReady, `Knowledge seed: ${document.id} top-level ingestReady is true`);
    assertTruthy(document.metadata && typeof document.metadata === "object", `Knowledge seed: ${document.id} has metadata`);
    assertSerializable(document.metadata, `Knowledge seed: ${document.id} metadata is serializable`);
    assertTruthy(document.metadata.ingestReady, `Knowledge seed: ${document.id} metadata ingestReady is true`);
    assertEqual(document.metadata.status, "enterprise_ready", `Knowledge seed: ${document.id} metadata status is enterprise_ready`);
    assertTruthy(typeof document.version === "string" && document.version.trim(), `Knowledge seed: ${document.id} has version`);
    assertArray(document.tags, `Knowledge seed: ${document.id} has tags`);
    assertEqual(document.version, "1.0.0", `Knowledge seed: ${document.id} uses enterprise seed version`);
    assertEqual(document.sourceType, expectedSourceTypeByCollection[collection], `Knowledge seed: ${document.id} uses approved source type`);
    assertTruthy(!document.tags.includes("placeholder"), `Knowledge seed: ${document.id} tags have no placeholder marker`);
    assertTruthy(!document.tags.includes("replace-with-approved-content"), `Knowledge seed: ${document.id} tags have no replacement marker`);

    const chunkPreparation = document.metadata.chunkPreparation;
    assertTruthy(chunkPreparation && typeof chunkPreparation === "object", `Knowledge seed: ${document.id} has chunk preparation metadata`);
    assertTruthy(typeof chunkPreparation.chunkType === "string" && chunkPreparation.chunkType.trim(), `Knowledge seed: ${document.id} has chunkType`);
    assertArray(chunkPreparation.domains, `Knowledge seed: ${document.id} has domains`);
    assertArray(chunkPreparation.contractTypes, `Knowledge seed: ${document.id} has contractTypes`);
    assertTruthy(typeof chunkPreparation.governanceArea === "string" && chunkPreparation.governanceArea.trim(), `Knowledge seed: ${document.id} has governanceArea`);
    assertTruthy(typeof chunkPreparation.severityRelevant === "boolean", `Knowledge seed: ${document.id} has severityRelevant flag`);
    assertTruthy(typeof chunkPreparation.gapRelevant === "boolean", `Knowledge seed: ${document.id} has gapRelevant flag`);
    assertTruthy(typeof chunkPreparation.priorityRelevant === "boolean", `Knowledge seed: ${document.id} has priorityRelevant flag`);
    assertArray(chunkPreparation.retrievalTags, `Knowledge seed: ${document.id} has retrievalTags`);
    assertTruthy(chunkPreparation.retrievalTags.length >= 3, `Knowledge seed: ${document.id} has retrieval-oriented tags`);
  });
});

const expectedFlattenedSeedDocuments = KB_COLLECTIONS.flatMap((collection) => KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION[collection]);
assertDeepEqual(
  KNOWLEDGE_SEED_DOCUMENTS,
  expectedFlattenedSeedDocuments,
  "Knowledge seed: flattened index follows KB_COLLECTIONS order"
);
assertDeepEqual(
  getKnowledgeSeedDocuments(),
  KNOWLEDGE_SEED_DOCUMENTS,
  "Knowledge seed: getKnowledgeSeedDocuments returns flattened index"
);
KB_COLLECTIONS.forEach((collection) => {
  assertDeepEqual(
    getKnowledgeSeedDocuments(collection),
    KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION[collection],
    `Knowledge seed: getKnowledgeSeedDocuments returns ${collection} subset`
  );
});

const ids = KNOWLEDGE_SEED_DOCUMENTS.map((document) => document.id);
assertEqual(new Set(ids).size, ids.length, "Knowledge seed: no duplicate seed IDs");

moduleCache.clear();
const reloaded = loadSeedIndex(false).seedIndex.KNOWLEDGE_SEED_DOCUMENTS;
assertDeepEqual(KNOWLEDGE_SEED_DOCUMENTS, reloaded, "Knowledge seed: seed index is deterministic across loads");

console.log("Knowledge seed probes passed.");
