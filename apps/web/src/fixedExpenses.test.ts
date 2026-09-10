import { describe, expect, it } from 'vitest';

import type { Transaction } from './api';
import {
	buildFixedExpenseCandidates,
	summarizeFixedExpenses,
	type FixedExpenseOverrideState,
} from './fixedExpenses';

let transactionCounter = 0;

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
	transactionCounter += 1;

	return {
		id: `tx-${transactionCounter}`,
		date: '2026-01-01T00:00:00.000Z',
		originalDescription: 'PAGAMENTO POS MERCHANT',
		normalizedDescription: 'MERCHANT',
		amount: -10,
		category: 'Bills',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function monthlyTransactions(
	merchant: string,
	category: string,
	amounts: Record<string, number>
): Transaction[] {
	return Object.entries(amounts).map(([month, amount]) =>
		buildTransaction({
			date: `${month}-15T00:00:00.000Z`,
			normalizedDescription: merchant,
			category,
			amount,
		})
	);
}

describe('buildFixedExpenseCandidates', () => {
	it('auto-detects a stable monthly subscription', () => {
		const transactions = monthlyTransactions('NETFLIX', 'Entertainment', {
			'2026-01': -12.99,
			'2026-02': -12.99,
			'2026-03': -12.99,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate).toMatchObject({
			merchant: 'NETFLIX',
			cadence: 'monthly',
			cadenceMonths: 1,
			isStableAmount: true,
			isAutoDetected: true,
			monthlyEquivalent: 12.99,
		});
	});

	it('infers a bimonthly cadence and halves the monthly equivalent', () => {
		const transactions = monthlyTransactions('MEDIOBANCA PREMIER', 'Bills', {
			'2026-01': -100,
			'2026-03': -100,
			'2026-05': -100,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate).toMatchObject({
			cadence: 'bimonthly',
			cadenceMonths: 2,
			monthlyEquivalent: 50,
			isAutoDetected: true,
		});
	});

	it('infers a quarterly cadence', () => {
		const transactions = monthlyTransactions('ONERI BANCARI', 'Fees', {
			'2026-01': -30,
			'2026-04': -30,
			'2026-07': -30,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate).toMatchObject({
			cadence: 'quarterly',
			cadenceMonths: 3,
			monthlyEquivalent: 10,
			isAutoDetected: true,
		});
	});

	it('does not auto-detect a merchant with unstable amounts, like a supermarket', () => {
		const transactions = monthlyTransactions('LIDL', 'Food', {
			'2026-01': -40,
			'2026-02': -95,
			'2026-03': -20,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate.isStableAmount).toBe(false);
		expect(candidate.isAutoDetected).toBe(false);
	});

	it('does not auto-detect a merchant with an irregular cadence', () => {
		const transactions = monthlyTransactions('AMAZON', 'Shopping', {
			'2026-01': -25,
			'2026-02': -25,
			'2026-05': -25,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate.cadence).toBe('irregular');
		expect(candidate.isAutoDetected).toBe(false);
	});

	it('does not auto-detect a merchant seen only once', () => {
		const transactions = monthlyTransactions('IKEA', 'Shopping', {
			'2026-01': -80,
		});

		const [candidate] = buildFixedExpenseCandidates(transactions);

		expect(candidate.occurrenceCount).toBe(1);
		expect(candidate.isAutoDetected).toBe(false);
	});

	it('ignores income transactions', () => {
		const transactions = [
			buildTransaction({ normalizedDescription: 'STIPENDIO', category: 'Income', amount: 1800 }),
		];

		expect(buildFixedExpenseCandidates(transactions)).toHaveLength(0);
	});

	it('sorts candidates by monthly equivalent, highest first', () => {
		const transactions = [
			...monthlyTransactions('NETFLIX', 'Entertainment', { '2026-01': -12.99, '2026-02': -12.99 }),
			...monthlyTransactions('AFFITTO', 'Home', { '2026-01': -600, '2026-02': -600 }),
		];

		const candidates = buildFixedExpenseCandidates(transactions);

		expect(candidates.map((candidate) => candidate.merchant)).toEqual(['AFFITTO', 'NETFLIX']);
	});
});

describe('summarizeFixedExpenses', () => {
	it('includes only auto-detected merchants by default and totals them', () => {
		const transactions = [
			...monthlyTransactions('NETFLIX', 'Entertainment', { '2026-01': -12.99, '2026-02': -12.99 }),
			...monthlyTransactions('LIDL', 'Food', { '2026-01': -40, '2026-02': -95 }),
		];
		const candidates = buildFixedExpenseCandidates(transactions);

		const summary = summarizeFixedExpenses(candidates, {});

		expect(summary.included.map((entry) => entry.merchant)).toEqual(['NETFLIX']);
		expect(summary.total).toBe(12.99);
		expect(summary.addableMerchants).toEqual(['LIDL']);
	});

	it('excludes an auto-detected merchant when overridden and keeps it visible', () => {
		const transactions = monthlyTransactions('NETFLIX', 'Entertainment', {
			'2026-01': -12.99,
			'2026-02': -12.99,
		});
		const candidates = buildFixedExpenseCandidates(transactions);
		const overrides: Record<string, FixedExpenseOverrideState> = { NETFLIX: 'excluded' };

		const summary = summarizeFixedExpenses(candidates, overrides);

		expect(summary.included).toHaveLength(0);
		expect(summary.excluded.map((entry) => entry.merchant)).toEqual(['NETFLIX']);
		expect(summary.total).toBe(0);
	});

	it('manually includes a merchant the heuristic did not pick up', () => {
		const transactions = monthlyTransactions('LIDL', 'Food', {
			'2026-01': -40,
			'2026-02': -95,
		});
		const candidates = buildFixedExpenseCandidates(transactions);
		const overrides: Record<string, FixedExpenseOverrideState> = { LIDL: 'included' };

		const summary = summarizeFixedExpenses(candidates, overrides);

		expect(summary.included.map((entry) => entry.merchant)).toEqual(['LIDL']);
		expect(summary.addableMerchants).toEqual([]);
	});
});
