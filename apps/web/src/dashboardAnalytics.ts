import type { Transaction } from './api';

export type MerchantFilterOption = {
	merchant: string;
	total: number;
	count: number;
};

export type LiquidityChartPoint = {
	month: string;
	savings: number;
	filteredSpend: number;
};

export type RecurringMerchantInsight = {
	merchant: string;
	total: number;
	activeMonths: number;
	averageMonthly: number;
};

export type ChartScale = {
	min: number;
	max: number;
	ticks: number[];
};

const DEFAULT_CHART_PADDING = {
	left: 64,
	right: 24,
	top: 20,
	bottom: 36,
};

const DISCRETIONARY_CATEGORIES = new Set([
	'Dining',
	'Entertainment',
	'Shopping',
	'Travel',
]);

function getMerchantKey(transaction: Transaction) {
	return transaction.normalizedDescription.trim() || transaction.originalDescription.trim();
}

function isMonthVisible(month: string, startMonth?: string, endMonth?: string) {
	if (startMonth && month < startMonth) {
		return false;
	}

	if (endMonth && month > endMonth) {
		return false;
	}

	return true;
}

export function buildMerchantFilterOptions(transactions: Transaction[]) {
	const merchantMap = new Map<string, { total: number; count: number }>();

	for (const transaction of transactions) {
		if (transaction.amount >= 0) {
			continue;
		}

		const merchantKey = getMerchantKey(transaction);
		const spendAmount = Math.abs(transaction.amount);
		const currentMerchant = merchantMap.get(merchantKey) ?? { total: 0, count: 0 };

		merchantMap.set(merchantKey, {
			total: currentMerchant.total + spendAmount,
			count: currentMerchant.count + 1,
		});
	}

	return [...merchantMap.entries()]
		.sort((left, right) => right[1].total - left[1].total)
		.map(([merchant, totals]) => ({
			merchant,
			total: Number(totals.total.toFixed(2)),
			count: totals.count,
		} satisfies MerchantFilterOption));
}

export function buildLiquidityChartSeries(params: {
	transactions: Transaction[];
	startMonth?: string;
	endMonth?: string;
	selectedMerchants: string[];
	selectedCategories: string[];
}) {
	const { transactions, startMonth, endMonth, selectedMerchants, selectedCategories } = params;
	const months = [...new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))].sort(
		(leftMonth, rightMonth) => leftMonth.localeCompare(rightMonth)
	);
	const visibleMonths = months.filter((month) => isMonthVisible(month, startMonth, endMonth));
	const monthlyMap = new Map<string, LiquidityChartPoint>();

	for (const month of visibleMonths) {
		monthlyMap.set(month, {
			month,
			savings: 0,
			filteredSpend: 0,
		});
	}

	for (const transaction of transactions) {
		const monthKey = transaction.date.slice(0, 7);
		const monthPoint = monthlyMap.get(monthKey);

		if (!monthPoint) {
			continue;
		}

		monthPoint.savings += transaction.amount;

		const matchesMerchant =
			selectedMerchants.length === 0 || selectedMerchants.includes(getMerchantKey(transaction));
		const matchesCategory =
			selectedCategories.length === 0 || selectedCategories.includes(transaction.category);

		if (transaction.amount < 0 && matchesMerchant && matchesCategory) {
			monthPoint.filteredSpend -= Math.abs(transaction.amount);
		}
	}

	return [...monthlyMap.values()].map((point) => ({
		month: point.month,
		savings: Number(point.savings.toFixed(2)),
		filteredSpend: Number(point.filteredSpend.toFixed(2)),
	}));
}

export function buildRecurringMerchantInsights(params: {
	transactions: Transaction[];
	startMonth?: string;
	endMonth?: string;
	selectedMerchants: string[];
	selectedCategories: string[];
	limit?: number;
}) {
	const {
		transactions,
		startMonth,
		endMonth,
		selectedMerchants,
		selectedCategories,
		limit = 3,
	} = params;
	const compressibleCategories = selectedCategories.length
		? new Set(
				selectedCategories.filter((category) =>
					DISCRETIONARY_CATEGORIES.has(category)
				)
		  )
		: DISCRETIONARY_CATEGORIES;

	if (compressibleCategories.size === 0) {
		return [] as RecurringMerchantInsight[];
	}

	const merchantMap = new Map<string, { total: number; months: Set<string> }>();

	for (const transaction of transactions) {
		if (transaction.amount >= 0) {
			continue;
		}

		const monthKey = transaction.date.slice(0, 7);

		if (!isMonthVisible(monthKey, startMonth, endMonth)) {
			continue;
		}

		const merchantKey = getMerchantKey(transaction);

		if (
			selectedMerchants.length > 0 &&
			!selectedMerchants.includes(merchantKey)
		) {
			continue;
		}

		if (!compressibleCategories.has(transaction.category)) {
			continue;
		}

		const currentMerchant = merchantMap.get(merchantKey) ?? {
			total: 0,
			months: new Set<string>(),
		};

		currentMerchant.total += Math.abs(transaction.amount);
		currentMerchant.months.add(monthKey);
		merchantMap.set(merchantKey, currentMerchant);
	}

	return [...merchantMap.entries()]
		.filter(([, merchantData]) => merchantData.months.size >= 2)
		.sort(
			(left, right) =>
				right[1].months.size - left[1].months.size ||
				right[1].total - left[1].total
		)
		.slice(0, limit)
		.map(([merchant, merchantData]) => ({
			merchant,
			total: Number(merchantData.total.toFixed(2)),
			activeMonths: merchantData.months.size,
			averageMonthly: Number(
				(merchantData.total / merchantData.months.size).toFixed(2)
			),
		}));
}

export function buildChartScale(values: number[], tickCount = 5): ChartScale {
	let min = Math.min(...values, 0);
	let max = Math.max(...values, 0);

	if (min === max) {
		if (min === 0) {
			max = 1;
		} else {
			const delta = Math.abs(min) * 0.2;
			min -= delta;
			max += delta;
		}
	}

	const ticks = Array.from({ length: tickCount }, (_, index) => {
		const ratio = index / Math.max(tickCount - 1, 1);
		const value = max - (max - min) * ratio;

		return Number(value.toFixed(2));
	});

	return {
		min,
		max,
		ticks,
	};
}

export function getChartX(index: number, count: number, width: number) {
	const usableWidth = width - DEFAULT_CHART_PADDING.left - DEFAULT_CHART_PADDING.right;

	return (
		DEFAULT_CHART_PADDING.left +
		(usableWidth * index) / Math.max(count - 1, 1)
	);
}

export function getChartY(value: number, scale: ChartScale, height: number) {
	const usableHeight = height - DEFAULT_CHART_PADDING.top - DEFAULT_CHART_PADDING.bottom;
	const range = scale.max - scale.min || 1;
	const ratio = (value - scale.min) / range;

	return height - DEFAULT_CHART_PADDING.bottom - ratio * usableHeight;
}

export function buildPolylineCoordinates(values: number[], scale: ChartScale, width: number, height: number) {
	if (!values.length) {
		return '';
	}

	return values
		.map((value, index) => `${getChartX(index, values.length, width)},${getChartY(value, scale, height)}`)
		.join(' ');
}

export function getChartPadding() {
	return DEFAULT_CHART_PADDING;
}