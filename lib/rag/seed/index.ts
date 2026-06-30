import { KB_COLLECTIONS, type KBCollection, type KBSeedDocument } from "../knowledge-types";
import { clauseLibrarySeed } from "./clause-library";
import { companyProfileSeed } from "./company-profile";
import { contractReviewChecklistSeed } from "./contract-review-checklist";
import { contractReviewPlaybookSeed } from "./contract-review-playbook";
import { privacyDataGovernanceStandardsSeed } from "./privacy-data-governance-standards";
import { procurementPolicySeed } from "./procurement-policy";
import { riskTaxonomySeed } from "./risk-taxonomy";
import { securityComplianceStandardsSeed } from "./security-compliance-standards";

export const KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION: Record<KBCollection, readonly KBSeedDocument[]> = {
  company_profile: companyProfileSeed,
  risk_taxonomy: riskTaxonomySeed,
  contract_review_playbook: contractReviewPlaybookSeed,
  contract_review_checklist: contractReviewChecklistSeed,
  security_compliance_standards: securityComplianceStandardsSeed,
  clause_library: clauseLibrarySeed,
  procurement_policy: procurementPolicySeed,
  privacy_data_governance_standards: privacyDataGovernanceStandardsSeed
};

export const KNOWLEDGE_SEED_DOCUMENTS = KB_COLLECTIONS.flatMap((collection) =>
  KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION[collection]
);

export function getKnowledgeSeedDocuments(collection?: KBCollection): readonly KBSeedDocument[] {
  return collection ? KNOWLEDGE_SEED_DOCUMENTS_BY_COLLECTION[collection] : KNOWLEDGE_SEED_DOCUMENTS;
}

export {
  clauseLibrarySeed,
  companyProfileSeed,
  contractReviewChecklistSeed,
  contractReviewPlaybookSeed,
  privacyDataGovernanceStandardsSeed,
  procurementPolicySeed,
  riskTaxonomySeed,
  securityComplianceStandardsSeed
};
