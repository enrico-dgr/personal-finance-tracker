import { describe, expect, it } from 'vitest';

import type { Transaction } from './api';
import { buildSessionStats } from './sessionStats';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: 'transaction-1',
		date: '2026-04-20T00:00:00.000Z',
		originalDescription: 'PAGAMENTO POS 1234 LIDL CATANIA',
		normalizedDescription: 'LIDL',
		amount: -45.2,
		category: 'Food',
		createdAt: '2026-04-20T00:00:00.000Z',
		updatedAt: '2026-04-20T00:00:00.000Z',
		...overrides,
	};
}

describe('buildSessionStats', () => {
	it('uses the most recent transaction month as the reference month', () => {
		const stats = buildSessionStats(
			[
				buildTransaction({ id: 'older', date: '2026-03-10T00:00:00.000Z' }),
				buildTransaction({ id: 'newer', date: '2026-04-10T00:00:00.000Z' }),
			],
			0
		);

		expect(stats.overview.referenceMonth).toBe('2026-04');
		expect(stats.overview.totalTransactions).toBe(2);
	});

	it('limits category and merchant breakdowns to the reference month', () => {
		const stats = buildSessionStats(
			[
				buildTransaction({ id: 'april', date: '2026-04-10T00:00:00.000Z', amount: -20 }),
				buildTransaction({
					id: 'march',
					date: '2026-03-10T00:00:00.000Z',
					amount: -100,
					category: 'Travel',
					normalizedDescription: 'TRENITALIA',
				}),
			],
			0
		);

		expect(stats.overview.currentMonthSpend).toBe(20);
		expect(stats.categorySpend).toEqual([{ category: 'Food', total: 20 }]);
		expect(stats.merchantSpend).toEqual([{ merchant: 'LIDL', total: 20, count: 1 }]);
	});

	it('keeps every month in the monthly spend series, oldest first', () => {
		const stats = buildSessionStats(
			[
				buildTransaction({ id: 'april', date: '2026-04-10T00:00:00.000Z', amount: -20 }),
				buildTransaction({ id: 'march', date: '2026-03-10T00:00:00.000Z', amount: -100 }),
			],
			0
		);

		expect(stats.monthlySpend).toEqual([
			{ month: '2026-03', total: 100 },
			{ month: '2026-04', total: 20 },
		]);
	});

	it('ignores income when computing spend', () => {
		const stats = buildSessionStats(
			[
				buildTransaction({ id: 'salary', amount: 1850, category: 'Income' }),
				buildTransaction({ id: 'groceries', amount: -50 }),
			],
			0
		);

		expect(stats.overview.currentMonthSpend).toBe(50);
		expect(stats.categorySpend).toEqual([{ category: 'Food', total: 50 }]);
	});

	it('builds a savings plan from discretionary categories only', () => {
		const stats = buildSessionStats(
			[
				buildTransaction({ id: 'dining', amount: -60, category: 'Dining' }),
				buildTransaction({ id: 'shopping', amount: -40, category: 'Shopping' }),
				buildTransaction({ id: 'bills', amount: -100, category: 'Bills' }),
			],
			0
		);

		expect(stats.savingsPlan.discretionaryTotal).toBe(100);
		expect(stats.savingsPlan.shareOfMonth).toBe(50);
		expect(stats.savingsPlan.scenario15).toBe(15);
		expect(stats.savingsPlan.scenario30).toBe(30);
		expect(stats.savingsPlan.categories).toEqual([
			{ category: 'Dining', total: 60 },
			{ category: 'Shopping', total: 40 },
		]);
	});

	it('falls back to the current month and avoids dividing by zero when there is no data', () => {
		const stats = buildSessionStats([], 7);

		expect(stats.overview.totalTransactions).toBe(0);
		expect(stats.overview.currentMonthSpend).toBe(0);
		expect(stats.overview.ruleCount).toBe(7);
		expect(stats.overview.referenceMonth).toMatch(/^\d{4}-\d{2}$/);
		expect(stats.savingsPlan.shareOfMonth).toBe(0);
		expect(stats.monthlySpend).toEqual([]);
	});

	it('falls back to the original description when the normalized merchant is blank', () => {
		const stats = buildSessionStats(
			[buildTransaction({ normalizedDescription: '   ', originalDescription: 'ADDEBITO SCONOSCIUTO' })],
			0
		);

		expect(stats.merchantSpend[0]?.merchant).toBe('ADDEBITO SCONOSCIUTO');
	});
});
