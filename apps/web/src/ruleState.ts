import { buildLocalRuleId } from './browserStorage';
import type { MerchantRule, RulePayload } from './api';

/**
 * Replaces the matching rule in place when one already exists, so that saving an
 * override never produces a duplicate entry for the same pattern or default rule.
 */
export function mergeRuleCollection(
	currentRules: MerchantRule[],
	incomingRule: MerchantRule
) {
	const existingRuleIndex = currentRules.findIndex(
		(rule) =>
			rule.id === incomingRule.id ||
			(rule.defaultRuleId !== null &&
				incomingRule.defaultRuleId !== null &&
				rule.defaultRuleId === incomingRule.defaultRuleId) ||
			(rule.pattern === incomingRule.pattern &&
				rule.patternType === incomingRule.patternType &&
				rule.defaultRuleId === incomingRule.defaultRuleId)
	);

	if (existingRuleIndex === -1) {
		return [incomingRule, ...currentRules];
	}

	const nextRules = [...currentRules];
	nextRules.splice(existingRuleIndex, 1, incomingRule);
	return nextRules;
}

export function buildLocalRule(
	payload: RulePayload,
	existingRule?: MerchantRule | null
) {
	const timestamp = new Date().toISOString();

	return {
		id: existingRule?.id ?? buildLocalRuleId(),
		defaultRuleId: payload.defaultRuleId ?? existingRule?.defaultRuleId ?? null,
		pattern: payload.pattern,
		patternType: payload.patternType,
		normalizedName: payload.normalizedName,
		category: payload.category,
		priority: payload.priority,
		isDisabled: Boolean(payload.isDisabled),
		source: payload.defaultRuleId ? 'default' : 'custom',
		createdAt: existingRule?.createdAt ?? timestamp,
		updatedAt: timestamp,
	} satisfies MerchantRule;
}
