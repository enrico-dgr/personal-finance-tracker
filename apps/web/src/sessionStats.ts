import type { StatsResponse, Transaction } from './api';

const DISCRETIONARY_CATEGORIES = new Set(['Dining', 'Entertainment', 'Shopping', 'Travel']);

export function buildSessionStats(transactions: Transaction[], ruleCount: number): StatsResponse {
  const sortedTransactions = [...transactions].sort((left, right) => right.date.localeCompare(left.date));
  const expenseTransactions = sortedTransactions.filter((transaction) => transaction.amount < 0);
  const referenceMonth =
    sortedTransactions[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);

  const monthlySpendMap = new Map<string, number>();
  const categorySpendMap = new Map<string, number>();
  const merchantSpendMap = new Map<string, { total: number; count: number }>();
  const discretionarySpendMap = new Map<string, number>();

  for (const transaction of expenseTransactions) {
    const monthKey = transaction.date.slice(0, 7);
    const spendAmount = Math.abs(transaction.amount);

    monthlySpendMap.set(monthKey, (monthlySpendMap.get(monthKey) ?? 0) + spendAmount);

    if (monthKey === referenceMonth) {
      categorySpendMap.set(
        transaction.category,
        (categorySpendMap.get(transaction.category) ?? 0) + spendAmount
      );

      const merchantKey = transaction.normalizedDescription.trim() || transaction.originalDescription.trim();
      const currentMerchantSpend = merchantSpendMap.get(merchantKey) ?? { total: 0, count: 0 };

      merchantSpendMap.set(merchantKey, {
        total: currentMerchantSpend.total + spendAmount,
        count: currentMerchantSpend.count + 1
      });

      if (DISCRETIONARY_CATEGORIES.has(transaction.category)) {
        discretionarySpendMap.set(
          transaction.category,
          (discretionarySpendMap.get(transaction.category) ?? 0) + spendAmount
        );
      }
    }
  }

  const currentMonthSpend = Number(
    [...categorySpendMap.values()].reduce((total, value) => total + value, 0).toFixed(2)
  );
  const discretionaryTotal = Number(
    [...discretionarySpendMap.values()].reduce((total, value) => total + value, 0).toFixed(2)
  );

  return {
    overview: {
      totalTransactions: sortedTransactions.length,
      currentMonthSpend,
      ruleCount,
      referenceMonth
    },
    monthlySpend: [...monthlySpendMap.entries()]
      .sort(([leftMonth], [rightMonth]) => leftMonth.localeCompare(rightMonth))
      .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) })),
    categorySpend: [...categorySpendMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) })),
    merchantSpend: [...merchantSpendMap.entries()]
      .sort((left, right) => right[1].total - left[1].total)
      .map(([merchant, totals]) => ({
        merchant,
        total: Number(totals.total.toFixed(2)),
        count: totals.count
      })),
    savingsPlan: {
      discretionaryTotal,
      shareOfMonth: currentMonthSpend > 0 ? Number(((discretionaryTotal / currentMonthSpend) * 100).toFixed(1)) : 0,
      scenario15: Number((discretionaryTotal * 0.15).toFixed(2)),
      scenario30: Number((discretionaryTotal * 0.3).toFixed(2)),
      categories: [...discretionarySpendMap.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    }
  };
}