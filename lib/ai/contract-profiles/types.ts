import type { RiskDomain } from "@/lib/ai/config/category-rules";

export type ContractType = "Generic Agreement" | "NDA" | "MSA" | "DPA" | "SaaS" | "Vendor Agreement";

export type ProfileClauseImportance = "Generally Required" | "Recommended";

export type ContractExpectedClause = {
  name: string;
  importance: ProfileClauseImportance;
  description?: string;
  domainFocus?: RiskDomain[];
};

export type ContractProfileSignals = {
  strongTitleSignals: string[];
  bodySignals: string[];
  negativeSignals?: string[];
};

export type ContractReviewProfile = {
  contractType: ContractType;
  displayName: string;
  description: string;
  generallyRequiredClauses: ContractExpectedClause[];
  recommendedClauses: ContractExpectedClause[];
  elevatedReviewTriggers: string[];
  domainFocus: RiskDomain[];
  reviewInstructions: string[];
  profileSignals?: ContractProfileSignals;
};
