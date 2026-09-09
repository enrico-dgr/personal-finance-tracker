import { describe, expect, it } from 'vitest';

import {
	buildLineChartPoints,
	buildPaginationItems,
	toggleSelection,
} from './uiHelpers';

describe('buildPaginationItems', () => {
	it('collapses to a single page when there is nothing to paginate', () => {
		expect(buildPaginationItems(1, 1)).toEqual([1]);
		expect(buildPaginationItems(1, 0)).toEqual([1]);
	});

	it('lists every page when they all fit around the current one', () => {
		expect(buildPaginationItems(2, 3)).toEqual([1, 2, 3]);
	});

	it('inserts an ellipsis for the gap after the first page', () => {
		expect(buildPaginationItems(8, 10)).toEqual([1, 'ellipsis', 7, 8, 9, 10]);
	});

	it('inserts ellipses on both sides when the current page is in the middle', () => {
		expect(buildPaginationItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
	});

	it('never emits pages outside the valid range', () => {
		expect(buildPaginationItems(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
		expect(buildPaginationItems(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
	});
});

describe('toggleSelection', () => {
	it('appends a value that is not selected yet', () => {
		expect(toggleSelection(['a'], 'b')).toEqual(['a', 'b']);
	});

	it('removes a value that is already selected', () => {
		expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b']);
	});

	it('does not mutate the original array', () => {
		const original = ['a'];
		toggleSelection(original, 'b');

		expect(original).toEqual(['a']);
	});
});

describe('buildLineChartPoints', () => {
	it('returns an empty string for an empty series', () => {
		expect(buildLineChartPoints([], 400, 200)).toBe('');
	});

	it('emits one coordinate pair per value', () => {
		expect(buildLineChartPoints([1, 2, 3], 400, 200).split(' ')).toHaveLength(3);
	});

	it('puts the highest value at the top of the plot area', () => {
		const [first, second] = buildLineChartPoints([0, 10], 400, 200).split(' ');
		const firstY = Number(first!.split(',')[1]);
		const secondY = Number(second!.split(',')[1]);

		expect(secondY).toBeLessThan(firstY);
	});

	it('keeps a single point pinned to the left padding', () => {
		expect(buildLineChartPoints([5], 400, 200).split(',')[0]).toBe('18');
	});
});
