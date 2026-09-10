import type { MerchantRule } from './api';
import type { FixedExpenseOverrideState } from './fixedExpenses';

const LOCAL_RULES_KEY = 'finance-tracker.local-rules';
const AUTH_TOKEN_KEY = 'finance-tracker.auth-token';
const FIXED_EXPENSE_OVERRIDES_KEY = 'finance-tracker.fixed-expense-overrides';

export function loadLocalRules() {
  if (typeof window === 'undefined') {
    return [] as MerchantRule[];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_RULES_KEY);

    if (!rawValue) {
      return [] as MerchantRule[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [] as MerchantRule[];
    }

    return parsedValue.filter(isMerchantRuleLike) as MerchantRule[];
  } catch {
    return [] as MerchantRule[];
  }
}

export function saveLocalRules(rules: MerchantRule[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_RULES_KEY, JSON.stringify(rules));
}

export function loadStoredAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveStoredAuthToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredAuthToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function buildLocalRuleId() {
  return `local-${crypto.randomUUID()}`;
}

export function loadFixedExpenseOverrides() {
  if (typeof window === 'undefined') {
    return {} as Record<string, FixedExpenseOverrideState>;
  }

  try {
    const rawValue = window.localStorage.getItem(FIXED_EXPENSE_OVERRIDES_KEY);

    if (!rawValue) {
      return {} as Record<string, FixedExpenseOverrideState>;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {} as Record<string, FixedExpenseOverrideState>;
    }

    const overrides: Record<string, FixedExpenseOverrideState> = {};

    for (const [merchant, state] of Object.entries(parsedValue as Record<string, unknown>)) {
      if (state === 'included' || state === 'excluded') {
        overrides[merchant] = state;
      }
    }

    return overrides;
  } catch {
    return {} as Record<string, FixedExpenseOverrideState>;
  }
}

export function saveFixedExpenseOverrides(overrides: Record<string, FixedExpenseOverrideState>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FIXED_EXPENSE_OVERRIDES_KEY, JSON.stringify(overrides));
}

function isMerchantRuleLike(value: unknown): value is MerchantRule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.pattern === 'string' &&
    typeof candidate.patternType === 'string' &&
    typeof candidate.normalizedName === 'string' &&
    typeof candidate.category === 'string' &&
    (typeof candidate.defaultRuleId === 'string' || candidate.defaultRuleId === null || candidate.defaultRuleId === undefined) &&
    (typeof candidate.priority === 'number' || candidate.priority === undefined) &&
    (typeof candidate.isDisabled === 'boolean' || candidate.isDisabled === undefined) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string'
  );
}