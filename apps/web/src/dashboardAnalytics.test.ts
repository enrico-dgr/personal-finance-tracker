import { describe, expect, it } from 'vitest';

import type { Transaction } from './api';
import {
	buildChartScale,
	buildLiquidityChartSeries,
	buildMerchantFilterOptions,
	buildPolylineCoordinates,
	buildRecurringMerchantInsights,
	getChartPadding,
	getChartX,
	getChartY,
} from './dashboardAnalytics';

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

describe('buildMerchantFilterOptions', () => {
	it('aggregates spend per merchant and sorts by total desc', () => {
		const options = buildMerchantFilterOptions([
			buildTransaction({ id: '1', amount: -10 }),
			buildTransaction({ id: '2', amount: -15 }),
			buildTransaction({ id: '3', amount: -100, normalizedDescription: 'IKEA' }),
		]);

		expect(options).toEqual([
			{ merchant: 'IKEA', total: 100, count: 1 },
			{ merchant: 'LIDL', total: 25, count: 2 },
		]);
	});

	it('excludes income rows', () => {
		const options = buildMerchantFilterOptions([
			buildTransaction({ id: 'salary', amount: 1850, normalizedDescription: 'STIPENDIO' }),
			buildTransaction({ id: 'spend', amount: -20 }),
		]);

		expect(options.map((option) => option.merchant)).toEqual(['LIDL']);
	});
});

describe('buildLiquidityChartSeries', () => {
	const transactions = [
		buildTransaction({ id: 'mar-spend', date: '2026-03-05T00:00:00.000Z', amount: -100 }),
		buildTransaction({ id: 'apr-salary', date: '2026-04-01T00:00:00.000Z', amount: 1000, category: 'Income' }),
		buildTransaction({ id: 'apr-food', date: '2026-04-05T00:00:00.000Z', amount: -200 }),
		buildTransaction({
			id: 'apr-fun',
			date: '2026-04-06T00:00:00.000Z',
			amount: -50,
			category: 'Entertainment',
			normalizedDescription: 'NETFLIX',
		}),
	];

	it('reports net savings and total spend when no filter is applied', () => {
		const series = buildLiquidityChartSeries({
			transactions,
			selectedMerchants: [],
			selectedCategories: [],
		});

		expect(series).toEqual([
			{ month: '2026-03', savings: -100, filteredSpend: -100 },
			{ month: '2026-04', savings: 750, filteredSpend: -250 },
		]);
	});

	it('narrows filteredSpend to the selected category while savings stay untouched', () => {
		const series = buildLiquidityChartSeries({
			transactions,
			selectedMerchants: [],
			selectedCategories: ['Entertainment'],
		});

		expect(series.find((point) => point.month === '2026-04')).toEqual({
			month: '2026-04',
			savings: 750,
			filteredSpend: -50,
		});
	});

	it('applies merchant and category filters together', () => {
		const series = buildLiquidityChartSeries({
			transactions,
			selectedMerchants: ['NETFLIX'],
			selectedCategories: ['Food'],
		});

		expect(series.find((point) => point.month === '2026-04')?.filteredSpend).toBe(0);
	});

	it('drops months outside the requested range', () => {
		const series = buildLiquidityChartSeries({
			transactions,
			startMonth: '2026-04',
			endMonth: '2026-04',
			selectedMerchants: [],
			selectedCategories: [],
		});

		expect(series.map((point) => point.month)).toEqual(['2026-04']);
	});
});

describe('buildRecurringMerchantInsights', () => {
	const transactions = [
		buildTransaction({
			id: 'netflix-mar',
			date: '2026-03-06T00:00:00.000Z',
			amount: -10,
			category: 'Entertainment',
			normalizedDescription: 'NETFLIX',
		}),
		buildTransaction({
			id: 'netflix-apr',
			date: '2026-04-06T00:00:00.000Z',
			amount: -20,
			category: 'Entertainment',
			normalizedDescription: 'NETFLIX',
		}),
		buildTransaction({ id: 'lidl-apr', date: '2026-04-07T00:00:00.000Z', amount: -80 }),
	];

	it('keeps only discretionary merchants seen in at least two months', () => {
		const insights = buildRecurringMerchantInsights({
			transactions,
			selectedMerchants: [],
			selectedCategories: [],
		});

		expect(insights).toEqual([
			{ merchant: 'NETFLIX', total: 30, activeMonths: 2, averageMonthly: 15 },
		]);
	});

	it('returns nothing when the selected categories are all non-discretionary', () => {
		const insights = buildRecurringMerchantInsights({
			transactions,
			selectedMerchants: [],
			selectedCategories: ['Bills'],
		});

		expect(insights).toEqual([]);
	});

	it('honours the result limit', () => {
		const insights = buildRecurringMerchantInsights({
			transactions,
			selectedMerchants: [],
			selectedCategories: [],
			limit: 0,
		});

		expect(insights).toEqual([]);
	});
});

describe('buildChartScale', () => {
	it('always includes zero in the range', () => {
		const scale = buildChartScale([10, 40]);

		expect(scale.min).toBe(0);
		expect(scale.max).toBe(40);
	});

	it('expands a flat non-zero series so the range is never empty', () => {
		const scale = buildChartScale([-50, -50]);

		expect(scale.min).toBeLessThan(scale.max);
	});

	it('falls back to a unit range for an all-zero series', () => {
		const scale = buildChartScale([0, 0]);

		expect(scale.min).toBe(0);
		expect(scale.max).toBe(1);
	});

	it('emits ticks from max down to min', () => {
		const scale = buildChartScale([0, 100], 3);

		expect(scale.ticks).toEqual([100, 50, 0]);
	});
});

describe('chart coordinates', () => {
	it('spans the full usable width across the series', () => {
		const padding = getChartPadding();

		expect(getChartX(0, 4, 400)).toBe(padding.left);
		expect(getChartX(3, 4, 400)).toBe(400 - padding.right);
	});

	it('keeps a single-point series pinned to the left padding', () => {
		expect(getChartX(0, 1, 400)).toBe(getChartPadding().left);
	});

	it('maps the scale maximum to the top of the plot area', () => {
		const scale = buildChartScale([0, 100]);

		expect(getChartY(100, scale, 200)).toBe(getChartPadding().top);
		expect(getChartY(0, scale, 200)).toBe(200 - getChartPadding().bottom);
	});

	it('returns an empty polyline for an empty series', () => {
		expect(buildPolylineCoordinates([], buildChartScale([0]), 400, 200)).toBe('');
	});

	it('emits one coordinate pair per value', () => {
		const coordinates = buildPolylineCoordinates([0, 50, 100], buildChartScale([0, 100]), 400, 200);

		expect(coordinates.split(' ')).toHaveLength(3);
	});
});
