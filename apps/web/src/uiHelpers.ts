/**
 * Small presentation-only helpers shared by the dashboard: chart point maths,
 * pagination layout and multi-select toggling.
 */
export function buildLineChartPoints(values: number[], width: number, height: number) {
	if (!values.length) {
		return '';
	}

	const paddingX = 18;
	const paddingY = 18;
	const usableWidth = width - paddingX * 2;
	const usableHeight = height - paddingY * 2;
	const maxValue = Math.max(...values, 1);

	return values
		.map((value, index) => {
			const x =
				paddingX + (usableWidth * index) / Math.max(values.length - 1, 1);
			const y = height - paddingY - (value / maxValue) * usableHeight;

			return `${x},${y}`;
		})
		.join(' ');
}

export function buildPaginationItems(currentPage: number, totalPages: number) {
	if (totalPages <= 1) {
		return [1];
	}

	const pageCandidates = new Set([
		1,
		totalPages,
		currentPage - 1,
		currentPage,
		currentPage + 1,
	]);
	const sanitizedPages = [...pageCandidates]
		.filter((page) => page >= 1 && page <= totalPages)
		.sort((left, right) => left - right);
	const paginationItems: Array<number | 'ellipsis'> = [];

	sanitizedPages.forEach((page, index) => {
		const previousPage = sanitizedPages[index - 1];

		if (previousPage && page - previousPage > 1) {
			paginationItems.push('ellipsis');
		}

		paginationItems.push(page);
	});

	return paginationItems;
}

export function toggleSelection(currentValues: string[], nextValue: string) {
	return currentValues.includes(nextValue)
		? currentValues.filter((value) => value !== nextValue)
		: [...currentValues, nextValue];
}
