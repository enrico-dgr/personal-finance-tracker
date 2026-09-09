import { describe, expect, it } from 'vitest';

import type { MerchantRule, Transaction } from './api';
import {
	buildEffectiveRuleLibrary,
	buildRulePayloadFromEffectiveRule,
	countMatchingTransactions,
	doesRuleMatchTransaction,
} from './ruleLibrary';

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

function buildTransaction(originalDescription: string): Transaction {
	return {
		id: 'transaction-1',
		date: '2026-04-20T00:00:00.000Z',
		originalDescription,
		normalizedDescription: '',
		amount: -10,
		category: 'Other',
		createdAt: '2026-04-20T00:00:00.000Z',
		updatedAt: '2026-04-20T00:00:00.000Z',
	};
}

describe('buildEffectiveRuleLibrary', () => {
	it('returns the default rules when the user has no overrides', () => {
		const library = buildEffectiveRuleLibrary([buildRule({ id: 'default-lidl' })], []);

		expect(library).toHaveLength(1);
		expect(library[0]?.source).toBe('default');
		expect(library[0]?.rawRuleId).toBeNull();
	});

	it('removes a default rule that the user disabled', () => {
		const library = buildEffectiveRuleLibrary(
			[buildRule({ id: 'default-lidl' })],
			[buildRule({ id: 'stored-1', defaultRuleId: 'default-lidl', isDisabled: true })]
		);

		expect(library).toHaveLength(0);
	});

	it('merges an override onto its default rule instead of duplicating it', () => {
		const library = buildEffectiveRuleLibrary(
			[buildRule({ id: 'default-lidl', category: 'Food' })],
			[
				buildRule({
					id: 'stored-1',
					defaultRuleId: 'default-lidl',
					category: 'Shopping',
					normalizedName: 'LIDL ITALIA',
				}),
			]
		);

		expect(library).toHaveLength(1);
		expect(library[0]).toMatchObject({
			id: 'default-lidl',
			category: 'Shopping',
			normalizedName: 'LIDL ITALIA',
			rawRuleId: 'stored-1',
			source: 'default',
		});
	});

	it('keeps an override whose default rule no longer exists', () => {
		const library = buildEffectiveRuleLibrary(
			[],
			[buildRule({ id: 'stored-1', defaultRuleId: 'default-gone' })]
		);

		expect(library).toHaveLength(1);
		expect(library[0]?.id).toBe('default-gone');
	});

	it('drops disabled custom rules but keeps active ones', () => {
		const library = buildEffectiveRuleLibrary(
			[],
			[
				buildRule({ id: 'custom-active', pattern: 'ESSELUNGA' }),
				buildRule({ id: 'custom-off', pattern: 'CONAD', isDisabled: true }),
			]
		);

		expect(library.map((rule) => rule.pattern)).toEqual(['ESSELUNGA']);
	});

	it('sorts by priority, then by pattern specificity, then by name', () => {
		const library = buildEffectiveRuleLibrary(
			[],
			[
				buildRule({ id: 'low', pattern: 'AAA', normalizedName: 'AAA', priority: 10 }),
				buildRule({ id: 'high', pattern: 'BB', normalizedName: 'BB', priority: 5000 }),
				buildRule({ id: 'specific', pattern: 'AAAAAA', normalizedName: 'LONG', priority: 10 }),
			]
		);

		expect(library.map((rule) => rule.id)).toEqual(['high', 'specific', 'low']);
	});
});

describe('buildRulePayloadFromEffectiveRule', () => {
	it('targets the stored override row for a default rule', () => {
		const [rule] = buildEffectiveRuleLibrary(
			[buildRule({ id: 'default-lidl' })],
			[buildRule({ id: 'stored-1', defaultRuleId: 'default-lidl' })]
		);

		expect(buildRulePayloadFromEffectiveRule(rule!, { category: 'Shopping' })).toMatchObject({
			id: 'stored-1',
			defaultRuleId: 'default-lidl',
			category: 'Shopping',
		});
	});

	it('marks a pristine default rule as a new override', () => {
		const [rule] = buildEffectiveRuleLibrary([buildRule({ id: 'default-lidl' })], []);

		expect(buildRulePayloadFromEffectiveRule(rule!)).toMatchObject({
			id: undefined,
			defaultRuleId: 'default-lidl',
		});
	});

	it('keeps custom rules detached from any default rule', () => {
		const [rule] = buildEffectiveRuleLibrary([], [buildRule({ id: 'custom-1' })]);

		expect(buildRulePayloadFromEffectiveRule(rule!)).toMatchObject({
			id: 'custom-1',
			defaultRuleId: null,
		});
	});
});

describe('doesRuleMatchTransaction', () => {
	it('matches after bank noise and numeric codes are stripped', () => {
		expect(
			doesRuleMatchTransaction(
				{ pattern: 'LIDL', patternType: 'contains' },
				buildTransaction('PAGAMENTO POS 1234 LIDL CATANIA')
			)
		).toBe(true);
	});

	it('ignores accents and punctuation on both sides', () => {
		expect(
			doesRuleMatchTransaction(
				{ pattern: 'netflix.com', patternType: 'contains' },
				buildTransaction('PAGAMENTO POS 7788 NETFLIX.COM')
			)
		).toBe(true);
	});

	it('does not match an unrelated merchant', () => {
		expect(
			doesRuleMatchTransaction(
				{ pattern: 'LIDL', patternType: 'contains' },
				buildTransaction('PAGAMENTO POS 4431 AMAZON EU')
			)
		).toBe(false);
	});

	it('supports case-insensitive regex patterns', () => {
		expect(
			doesRuleMatchTransaction(
				{ pattern: '^ADDEBITO', patternType: 'regex' },
				buildTransaction('Addebito diretto energia')
			)
		).toBe(true);
	});

	it('returns false instead of throwing on an invalid regex', () => {
		expect(
			doesRuleMatchTransaction({ pattern: '([', patternType: 'regex' }, buildTransaction('LIDL'))
		).toBe(false);
	});

	it('returns false for a pattern that sanitises down to nothing', () => {
		expect(
			doesRuleMatchTransaction({ pattern: '***', patternType: 'contains' }, buildTransaction('LIDL'))
		).toBe(false);
	});
});

describe('countMatchingTransactions', () => {
	it('counts only the transactions the rule matches', () => {
		const count = countMatchingTransactions({ pattern: 'LIDL', patternType: 'contains' }, [
			buildTransaction('PAGAMENTO POS 1234 LIDL CATANIA'),
			buildTransaction('PAGAMENTO POS 9999 LIDL MILANO'),
			buildTransaction('PAGAMENTO POS 4431 AMAZON EU'),
		]);

		expect(count).toBe(2);
	});
});
