import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MerchantRule } from './api';
import {
	loadAuthenticatedRules,
	loadLocalRules,
	saveAuthenticatedRules,
	saveLocalRules,
} from './browserStorage';

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

function stubWindowStorage() {
	const values = new Map<string, string>();

	vi.stubGlobal('window', {
		localStorage: {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => {
				values.set(key, value);
			},
			removeItem: (key: string) => {
				values.delete(key);
			},
		},
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('rule storage', () => {
	it('keeps anonymous and authenticated rules in separate storage keys', () => {
		stubWindowStorage();

		saveLocalRules([buildRule({ id: 'local-rule', pattern: 'CONAD' })]);
		saveAuthenticatedRules([buildRule({ id: 'account-rule', pattern: 'LIDL' })]);

		expect(loadLocalRules().map((rule) => rule.id)).toEqual(['local-rule']);
		expect(loadAuthenticatedRules().map((rule) => rule.id)).toEqual([
			'account-rule',
		]);
	});
});