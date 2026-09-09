const currencyFormatter = new Intl.NumberFormat('it-IT', {
	style: 'currency',
	currency: 'EUR',
});

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('it-IT', {
	month: 'long',
	year: 'numeric',
});

export function formatMonth(month: string) {
	return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

export function formatAmount(amount: number) {
	return currencyFormatter.format(amount);
}

export function formatDate(date: string) {
	return dateFormatter.format(new Date(date));
}

export function formatSelectSummary(
	selectedValues: string[],
	emptyLabel: string,
	pluralLabel: string
) {
	if (selectedValues.length === 0) {
		return emptyLabel;
	}

	if (selectedValues.length === 1) {
		return selectedValues[0];
	}

	return `${selectedValues.length} ${pluralLabel}`;
}

export function formatFilterSummary(
	count: number,
	singularLabel: string,
	pluralLabel: string,
	fallbackLabel: string
) {
	if (count === 0) {
		return fallbackLabel;
	}

	return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
}

export function describeMonthComparison(
	delta: number,
	previousMonth: string,
	mode: 'expense' | 'savings'
) {
	if (Math.abs(delta) < 0.01) {
		return `In linea con ${formatMonth(previousMonth)}.`;
	}

	if (mode === 'expense') {
		return delta < 0
			? `${formatAmount(Math.abs(delta))} in meno di ${formatMonth(previousMonth)}.`
			: `${formatAmount(delta)} in piu di ${formatMonth(previousMonth)}.`;
	}

	return delta > 0
		? `${formatAmount(delta)} meglio di ${formatMonth(previousMonth)}.`
		: `${formatAmount(Math.abs(delta))} peggio di ${formatMonth(previousMonth)}.`;
}
