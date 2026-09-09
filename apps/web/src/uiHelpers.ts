/**
 * Small presentation-only helpers shared by the dashboard: pagination layout
 * and multi-select toggling.
 */
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
