import { describe, expect, it } from 'vitest';

import {
	describeFixedExpenseCadence,
	describeMonthComparison,
	formatFilterSummary,
	formatSelectSummary,
} from './formatters';

describe('formatSelectSummary', () => {
	it('returns the empty label when nothing is selected', () => {
		expect(formatSelectSummary([], 'Tutti', 'categorie')).toBe('Tutti');
	});

	it('returns the value itself for a single selection', () => {
		expect(formatSelectSummary(['Food'], 'Tutti', 'categorie')).toBe('Food');
	});

	it('counts the selection when more than one value is picked', () => {
		expect(formatSelectSummary(['Food', 'Travel'], 'Tutti', 'categorie')).toBe('2 categorie');
	});
});

describe('formatFilterSummary', () => {
	it('returns the fallback label for an empty filter', () => {
		expect(formatFilterSummary(0, 'regola', 'regole', 'Nessuna regola')).toBe('Nessuna regola');
	});

	it('uses the singular label for exactly one item', () => {
		expect(formatFilterSummary(1, 'regola', 'regole', 'Nessuna regola')).toBe('1 regola');
	});

	it('uses the plural label beyond one item', () => {
		expect(formatFilterSummary(4, 'regola', 'regole', 'Nessuna regola')).toBe('4 regole');
	});
});

describe('describeMonthComparison', () => {
	it('reports a flat month when the delta is below one cent', () => {
		expect(describeMonthComparison(0.004, '2026-03', 'expense')).toContain('In linea con');
	});

	it('frames a negative expense delta as spending less', () => {
		expect(describeMonthComparison(-50, '2026-03', 'expense')).toContain('in meno di');
	});

	it('frames a positive expense delta as spending more', () => {
		expect(describeMonthComparison(50, '2026-03', 'expense')).toContain('in piu di');
	});

	it('frames a positive savings delta as an improvement', () => {
		expect(describeMonthComparison(50, '2026-03', 'savings')).toContain('meglio di');
	});

	it('frames a negative savings delta as a regression', () => {
		expect(describeMonthComparison(-50, '2026-03', 'savings')).toContain('peggio di');
	});
});

describe('describeFixedExpenseCadence', () => {
	it('labels a monthly cadence', () => {
		expect(describeFixedExpenseCadence('monthly', 1)).toBe('mensile');
	});

	it('labels a bimonthly cadence', () => {
		expect(describeFixedExpenseCadence('bimonthly', 2)).toBe('bimestrale');
	});

	it('labels a quarterly cadence', () => {
		expect(describeFixedExpenseCadence('quarterly', 3)).toBe('trimestrale');
		expect(describeFixedExpenseCadence('semiannual', 6)).toBe('semestrale');
	});

	it('describes an irregular cadence with the average gap', () => {
		expect(describeFixedExpenseCadence('irregular', 4)).toContain('ogni 4 mesi');
	});
});
