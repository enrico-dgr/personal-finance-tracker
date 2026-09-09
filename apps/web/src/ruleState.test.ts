import { describe, expect, it } from 'vitest';

import type { MerchantRule, RulePayload } from './api';
import { buildLocalRule, mergeRuleCollection } from './ruleState';

function buildRule(overrides: Partial<MerchantRule> = {}): MerchantRule {
	return {
		id: 'rule-1',
		defaultRuleId: null,
		pattern: 'LIDL',
		patternType: 'contains',
		normalizedName: 'LIDL',
		category: 'Food',
		priority: 1000,
		isDisabled: false,
		createdAt: '2026-04-20T00:00:00.000Z',
		updatedAt: '2026-04-20T00:00:00.000Z',
		...overrides,
	};
}

function buildPayload(overrides: Partial<RulePayload> = {}): RulePayload {
	return {
		defaultRuleId: null,
		pattern: 'LIDL',
		patternType: 'contains',
		normalizedName: 'LIDL',
		category: 'Food',
		priority: 1000,
		...overrides,
	};
}

describe('mergeRuleCollection', () => {
	it('prepends a rule that does not exist yet', () => {
		const merged = mergeRuleCollection([buildRule({ id: 'existing', pattern: 'CONAD' })], buildRule({ id: 'new' }));

		expect(merged.map((rule) => rule.id)).toEqual(['new', 'existing']);
	});

	it('replaces a rule with the same id in place', () => {
		const merged = mergeRuleCollection(
			[buildRule({ id: 'a', pattern: 'CONAD' }), buildRule({ id: 'b' })],
			buildRule({ id: 'b', category: 'Shopping' })
		);

		expect(merged).toHaveLength(2);
		expect(merged[1]).toMatchObject({ id: 'b', category: 'Shopping' });
	});

	it('replaces a rule that overrides the same default rule', () => {
		const merged = mergeRuleCollection(
			[buildRule({ id: 'old', defaultRuleId: 'default-lidl' })],
			buildRule({ id: 'new', defaultRuleId: 'default-lidl', category: 'Shopping' })
		);

		expect(merged).toHaveLength(1);
		expect(merged[0]).toMatchObject({ id: 'new', category: 'Shopping' });
	});

	it('replaces a rule with the same pattern and pattern type', () => {
		const merged = mergeRuleCollection(
			[buildRule({ id: 'old' })],
			buildRule({ id: 'new', normalizedName: 'LIDL ITALIA' })
		);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.normalizedName).toBe('LIDL ITALIA');
	});

	it('keeps rules that share a pattern but not the pattern type', () => {
		const merged = mergeRuleCollection(
			[buildRule({ id: 'contains' })],
			buildRule({ id: 'regex', patternType: 'regex' })
		);

		expect(merged).toHaveLength(2);
	});

	it('does not treat two rules with null defaultRuleId as the same override', () => {
		const merged = mergeRuleCollection(
			[buildRule({ id: 'a', pattern: 'CONAD' })],
			buildRule({ id: 'b', pattern: 'ESSELUNGA' })
		);

		expect(merged).toHaveLength(2);
	});

	it('does not mutate the input collection', () => {
		const original = [buildRule({ id: 'a' })];
		mergeRuleCollection(original, buildRule({ id: 'a', category: 'Shopping' }));

		expect(original[0]?.category).toBe('Food');
	});
});

describe('buildLocalRule', () => {
	it('generates a local id and timestamps for a brand new rule', () => {
		const rule = buildLocalRule(buildPayload());

		expect(rule.id).toMatch(/^local-/);
		expect(rule.source).toBe('custom');
		expect(rule.createdAt).toBe(rule.updatedAt);
	});

	it('reuses the existing id and creation date when updating', () => {
		const existingRule = buildRule({ id: 'local-existing', createdAt: '2026-01-01T00:00:00.000Z' });
		const rule = buildLocalRule(buildPayload({ category: 'Shopping' }), existingRule);

		expect(rule.id).toBe('local-existing');
		expect(rule.createdAt).toBe('2026-01-01T00:00:00.000Z');
		expect(rule.updatedAt).not.toBe(rule.createdAt);
		expect(rule.category).toBe('Shopping');
	});

	it('marks an override of a default rule as a default-sourced rule', () => {
		const rule = buildLocalRule(buildPayload({ defaultRuleId: 'default-lidl' }));

		expect(rule.source).toBe('default');
		expect(rule.defaultRuleId).toBe('default-lidl');
	});

	it('inherits the default rule link from the existing rule when the payload omits it', () => {
		const rule = buildLocalRule(buildPayload(), buildRule({ defaultRuleId: 'default-lidl' }));

		expect(rule.defaultRuleId).toBe('default-lidl');
	});

	it('normalises a missing isDisabled flag to false', () => {
		expect(buildLocalRule(buildPayload()).isDisabled).toBe(false);
	});
});
