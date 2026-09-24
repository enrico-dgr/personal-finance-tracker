import type { Transaction } from './api';

export type FixedExpenseCadence = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'irregular';

export type FixedExpenseOverrideState = 'included' | 'excluded' | 'deleted';

export type FixedExpenseCandidate = {
	merchant: string;
	category: string;
	occurrenceCount: number;
	spanMonths: number;
	cadence: FixedExpenseCadence;
	cadenceMonths: number;
	totalObserved: number;
	averagePerOccurrence: number;
	monthlyEquivalent: number;
	amountVariance: number;
	isStableAmount: boolean;
	isAutoDetected: boolean;
};

export type FixedExpenseEntry = FixedExpenseCandidate & {
	isIncluded: boolean;
	overrideState: FixedExpenseOverrideState | null;
};

export type FixedExpensesSummary = {
	included: FixedExpenseEntry[];
	excluded: FixedExpenseEntry[];
	total: number;
	addableMerchants: string[];
};

// A merchant needs at least two occurrences before a cadence can be inferred at all.
const MIN_OCCURRENCES_FOR_AUTO_DETECTION = 2;
// Coefficient of variation ceiling: keeps out merchants like supermarkets that
// recur often but at a different amount every time.
const STABLE_AMOUNT_VARIATION_THRESHOLD = 0.2;
// Tolerates the +/-1 month jitter that bank posting dates introduce around a
// "real" monthly/bimonthly/quarterly cadence without calling it irregular.
const REGULAR_GAP_STD_DEV_THRESHOLD = 0.6;

function getMerchantKey(transaction: Transaction) {
	return transaction.normalizedDescription.trim() || transaction.originalDescription.trim();
}

function monthIndex(month: string) {
	const [year, monthNumber] = month.split('-').map(Number);

	return year * 12 + (monthNumber - 1);
}

function inferCadence(sortedMonthKeys: string[]): {
	cadence: FixedExpenseCadence;
	cadenceMonths: number;
} {
	if (sortedMonthKeys.length < 2) {
		return { cadence: 'monthly', cadenceMonths: 1 };
	}

	const sortedIndexes = sortedMonthKeys.map(monthIndex);
	const gaps = sortedIndexes.slice(1).map((value, index) => value - sortedIndexes[index]);
	const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
	const gapVariance =
		gaps.reduce((sum, gap) => sum + (gap - averageGap) ** 2, 0) / gaps.length;
	const gapStdDev = Math.sqrt(gapVariance);
	const isRegularGap = gapStdDev <= REGULAR_GAP_STD_DEV_THRESHOLD;
	const roundedGap = Math.max(1, Math.round(averageGap) || 1);

	if (!isRegularGap) {
		return { cadence: 'irregular', cadenceMonths: roundedGap };
	}

	if (roundedGap === 1) {
		return { cadence: 'monthly', cadenceMonths: 1 };
	}

	if (roundedGap === 2) {
		return { cadence: 'bimonthly', cadenceMonths: 2 };
	}

	if (roundedGap === 3) {
		return { cadence: 'quarterly', cadenceMonths: 3 };
	}

	if (roundedGap === 6 && gaps.every((gap) => gap === 6)) {
		return { cadence: 'semiannual', cadenceMonths: 6 };
	}

	return { cadence: 'irregular', cadenceMonths: roundedGap };
}

export function buildFixedExpenseCandidates(transactions: Transaction[]): FixedExpenseCandidate[] {
	const merchantMap = new Map<string, { category: string; monthlyTotals: Map<string, number> }>();
	let earliestMonth = Infinity;
	let latestMonth = -Infinity;

	for (const transaction of transactions) {
		const observedMonth = monthIndex(transaction.date.slice(0, 7));
		earliestMonth = Math.min(earliestMonth, observedMonth);
		latestMonth = Math.max(latestMonth, observedMonth);

		if (transaction.amount >= 0) {
			continue;
		}

		const merchant = getMerchantKey(transaction);
		const monthKey = transaction.date.slice(0, 7);
		const spendAmount = Math.abs(transaction.amount);
		const current = merchantMap.get(merchant) ?? {
			category: transaction.category,
			monthlyTotals: new Map<string, number>(),
		};

		current.monthlyTotals.set(monthKey, (current.monthlyTotals.get(monthKey) ?? 0) + spendAmount);
		merchantMap.set(merchant, current);
	}
	const observationSpanMonths = transactions.length ? latestMonth - earliestMonth + 1 : 0;

	const candidates: FixedExpenseCandidate[] = [];

	for (const [merchant, data] of merchantMap.entries()) {
		const sortedMonthKeys = [...data.monthlyTotals.keys()].sort();
		const amounts = sortedMonthKeys.map((monthKey) => data.monthlyTotals.get(monthKey) ?? 0);
		const occurrenceCount = sortedMonthKeys.length;
		const totalObserved = amounts.reduce((sum, value) => sum + value, 0);
		const averagePerOccurrence = totalObserved / occurrenceCount;
		const amountVarianceRaw =
			amounts.reduce((sum, value) => sum + (value - averagePerOccurrence) ** 2, 0) /
			occurrenceCount;
		const amountStdDev = Math.sqrt(amountVarianceRaw);
		const amountVariance = averagePerOccurrence > 0 ? amountStdDev / averagePerOccurrence : 0;
		const isStableAmount = amountVariance <= STABLE_AMOUNT_VARIATION_THRESHOLD;
		const spanMonths =
			occurrenceCount >= 2
				? monthIndex(sortedMonthKeys[sortedMonthKeys.length - 1]) - monthIndex(sortedMonthKeys[0]) + 1
				: 1;
		const { cadence, cadenceMonths } = inferCadence(sortedMonthKeys);
		const monthlyEquivalent = averagePerOccurrence / cadenceMonths;
		const isAutoDetected =
			occurrenceCount >= MIN_OCCURRENCES_FOR_AUTO_DETECTION &&
			isStableAmount &&
			cadence !== 'irregular' &&
			(observationSpanMonths < 12 || occurrenceCount > 2 || cadence === 'semiannual');

		candidates.push({
			merchant,
			category: data.category,
			occurrenceCount,
			spanMonths,
			cadence,
			cadenceMonths,
			totalObserved: Number(totalObserved.toFixed(2)),
			averagePerOccurrence: Number(averagePerOccurrence.toFixed(2)),
			monthlyEquivalent: Number(monthlyEquivalent.toFixed(2)),
			amountVariance: Number(amountVariance.toFixed(3)),
			isStableAmount,
			isAutoDetected,
		});
	}

	return candidates.sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent);
}

export function summarizeFixedExpenses(
	candidates: FixedExpenseCandidate[],
	overrides: Record<string, FixedExpenseOverrideState>
): FixedExpensesSummary {
	const entries: FixedExpenseEntry[] = candidates.map((candidate) => {
		const overrideState = overrides[candidate.merchant] ?? null;
		const isIncluded =
			overrideState === 'excluded'
				? false
				: overrideState === 'included'
				  ? true
				  : candidate.isAutoDetected;

		return { ...candidate, isIncluded, overrideState };
	});

	// Only show merchants the algorithm picked up on its own, or ones the user
	// has explicitly toggled either way. Everything else stays out of sight and
	// is only reachable through the "add manually" picker.
	const visible = entries.filter((entry) => entry.isIncluded || entry.overrideState !== null);
	const included = visible
		.filter((entry) => entry.isIncluded)
		.sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent);
	const excluded = visible
		.filter((entry) => !entry.isIncluded && entry.overrideState !== 'deleted')
		.sort((left, right) => right.monthlyEquivalent - left.monthlyEquivalent);
	const addableMerchants = entries
		.filter((entry) => !entry.isIncluded && entry.overrideState === null)
		.map((entry) => entry.merchant)
		.sort((left, right) => left.localeCompare(right));

	return {
		included,
		excluded,
		total: Number(included.reduce((sum, entry) => sum + entry.monthlyEquivalent, 0).toFixed(2)),
		addableMerchants,
	};
}
