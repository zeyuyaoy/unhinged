const blockedPatterns = [
  /fake (a |an )?(death|funeral|medical|doctor|hospital|police|court)/i,
  /(forge|fabricate|fake)\s+(a |an )?(medical |police |official )?(document|certificate|letter|receipt|evidence|signature)/i,
  /(impersonate|pretend to be) (the )?(police|doctor|government|bank|teacher)/i,
  /(insurance|bank|payment|refund|financial) fraud/i,
  /(bomb|hostage|kidnap|murder|suicide) excuse/i,
  /\b(died|death|funeral|hospitali[sz]ed|cancer|heart attack|stroke|arrested|police report|medical certificate)\b/i,
];

export interface SafetyAssessment {
  allowed: boolean;
  message?: string;
}

export function assessScenario(input: string): SafetyAssessment {
  const matched = blockedPatterns.some((pattern) => pattern.test(input));
  if (!matched) return { allowed: true };
  return {
    allowed: false,
    message:
      "I can make this dramatically over-the-top without inventing a serious emergency, crime, medical claim, or official evidence. Try a harmless transport, weather, animal, or scheduling mishap instead.",
  };
}

export function containsUnsafeGeneratedClaim(input: string) {
  return blockedPatterns.some((pattern) => pattern.test(input));
}
