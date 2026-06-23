import { dpaProfile } from "./dpa-profile";
import { genericProfile } from "./generic-profile";
import { msaProfile } from "./msa-profile";
import { ndaProfile } from "./nda-profile";
import { saasProfile } from "./saas-profile";
import type { ContractReviewProfile, ContractType } from "./types";
import { vendorProfile } from "./vendor-profile";

export type ContractTypeDetectionResult = {
  contractType: ContractType;
  confidence: number;
  evidence: string[];
  selectedProfile: ContractReviewProfile;
  scores?: Record<string, number>;
};

type ProfileScore = {
  profile: ContractReviewProfile;
  score: number;
  strongMatches: string[];
  bodyMatches: string[];
  negativeMatches: string[];
};

const SPECIFIC_PROFILES: ContractReviewProfile[] = [ndaProfile, msaProfile, dpaProfile, saasProfile, vendorProfile];
const ALL_PROFILES: ContractReviewProfile[] = [genericProfile, ...SPECIFIC_PROFILES];

const STRONG_TITLE_WEIGHT = 6;
const BODY_SIGNAL_WEIGHT = 2;
const NEGATIVE_SIGNAL_WEIGHT = 3;
const MIN_SPECIFIC_SCORE = 4;
const AMBIGUOUS_MARGIN = 3;

export function detectContractType(text: string): ContractTypeDetectionResult {
  const normalizedText = normalizeSignalText(text);

  if (!normalizedText) {
    return buildGenericResult(["No contract text was available for profile detection."]);
  }

  const profileScores = SPECIFIC_PROFILES.map((profile) => scoreProfile(profile, normalizedText)).sort(
    (left, right) => right.score - left.score || left.profile.contractType.localeCompare(right.profile.contractType)
  );
  const scores = Object.fromEntries(profileScores.map((profileScore) => [profileScore.profile.contractType, profileScore.score]));
  const topScore = profileScores[0];
  const secondScore = profileScores[1];

  if (!topScore || topScore.score < MIN_SPECIFIC_SCORE) {
    return buildGenericResult(["No specific contract profile had enough matched signals."], scores);
  }

  const hasStrongTitleSignal = topScore.strongMatches.length > 0;
  const margin = secondScore ? topScore.score - secondScore.score : topScore.score;

  if (!hasStrongTitleSignal && secondScore && margin < AMBIGUOUS_MARGIN) {
    return buildGenericResult(
      [
        `${topScore.profile.contractType} and ${secondScore.profile.contractType} signals were too close without a strong title signal.`,
        ...buildMatchEvidence(topScore)
      ],
      scores
    );
  }

  return {
    contractType: topScore.profile.contractType,
    confidence: getSpecificConfidence(topScore, margin, hasStrongTitleSignal),
    evidence: [
      `Selected ${topScore.profile.contractType} based on profile detection signals.`,
      ...buildMatchEvidence(topScore),
      secondScore ? `Next closest profile was ${secondScore.profile.contractType} with score ${secondScore.score}.` : ""
    ].filter(Boolean),
    selectedProfile: topScore.profile,
    scores
  };
}

export function getProfileForContractType(contractType: ContractType): ContractReviewProfile {
  return ALL_PROFILES.find((profile) => profile.contractType === contractType) ?? genericProfile;
}

function scoreProfile(profile: ContractReviewProfile, normalizedText: string): ProfileScore {
  const signals = profile.profileSignals;
  const strongMatches = getMatchedSignals(normalizedText, signals?.strongTitleSignals ?? []);
  const bodyMatches = getMatchedSignals(normalizedText, signals?.bodySignals ?? []);
  const negativeMatches = getMatchedSignals(normalizedText, signals?.negativeSignals ?? []);
  const score =
    strongMatches.length * STRONG_TITLE_WEIGHT +
    bodyMatches.length * BODY_SIGNAL_WEIGHT -
    negativeMatches.length * NEGATIVE_SIGNAL_WEIGHT;

  return {
    profile,
    score: Math.max(0, score),
    strongMatches,
    bodyMatches,
    negativeMatches
  };
}

function getMatchedSignals(normalizedText: string, signals: string[]) {
  return signals.filter((signal) => {
    const normalizedSignal = normalizeSignalText(signal);
    return Boolean(normalizedSignal) && containsSignal(normalizedText, normalizedSignal);
  });
}

function containsSignal(normalizedText: string, normalizedSignal: string) {
  return ` ${normalizedText} `.includes(` ${normalizedSignal} `);
}

function normalizeSignalText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpecificConfidence(score: ProfileScore, margin: number, hasStrongTitleSignal: boolean) {
  if (hasStrongTitleSignal && margin >= AMBIGUOUS_MARGIN) {
    return clampConfidence(0.9 + Math.min(0.08, margin * 0.01));
  }

  if (score.bodyMatches.length >= 3 && margin >= 2) {
    return clampConfidence(0.72 + Math.min(0.15, score.bodyMatches.length * 0.03));
  }

  return clampConfidence(0.5 + Math.min(0.19, score.score * 0.02));
}

function clampConfidence(value: number) {
  return Number(Math.min(0.98, Math.max(0.4, value)).toFixed(2));
}

function buildGenericResult(evidence: string[], scores?: Record<string, number>): ContractTypeDetectionResult {
  return {
    contractType: genericProfile.contractType,
    confidence: 0.4,
    evidence: [`Selected ${genericProfile.contractType} fallback.`, ...evidence],
    selectedProfile: genericProfile,
    scores
  };
}

function buildMatchEvidence(score: ProfileScore) {
  const evidence = [`${score.profile.contractType} score: ${score.score}.`];

  if (score.strongMatches.length) {
    evidence.push(`Strong title signals matched: ${score.strongMatches.join(", ")}.`);
  }

  if (score.bodyMatches.length) {
    evidence.push(`Body signals matched: ${score.bodyMatches.join(", ")}.`);
  }

  if (score.negativeMatches.length) {
    evidence.push(`Negative signals matched: ${score.negativeMatches.join(", ")}.`);
  }

  return evidence;
}
