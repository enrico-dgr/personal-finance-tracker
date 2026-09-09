import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildHashRoute, readHashRoute } from './routing';

function stubHash(hash: string) {
	vi.stubGlobal('window', { location: { hash } });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('readHashRoute', () => {
	it('falls back to the dashboard when there is no window', () => {
		expect(readHashRoute()).toEqual({ page: 'dashboard', authMode: 'login' });
	});

	it.each([
		['#/rules', { page: 'rules', authMode: 'login' }],
		['#/auth', { page: 'auth', authMode: 'login' }],
		['#/auth/login', { page: 'auth', authMode: 'login' }],
		['#/auth/signup', { page: 'auth', authMode: 'signup' }],
		['#/dashboard', { page: 'dashboard', authMode: 'login' }],
	])('maps %s to the matching route', (hash, expected) => {
		stubHash(hash);

		expect(readHashRoute()).toEqual(expected);
	});

	it('tolerates hashes written without the leading slash', () => {
		stubHash('#rules');

		expect(readHashRoute().page).toBe('rules');
	});

	it('falls back to the dashboard for an unknown hash', () => {
		stubHash('#/does-not-exist');

		expect(readHashRoute()).toEqual({ page: 'dashboard', authMode: 'login' });
	});
});

describe('buildHashRoute', () => {
	it('round-trips every route back through readHashRoute', () => {
		const routes = [
			{ page: 'dashboard', authMode: 'login' },
			{ page: 'rules', authMode: 'login' },
			{ page: 'auth', authMode: 'login' },
			{ page: 'auth', authMode: 'signup' },
		] as const;

		for (const route of routes) {
			stubHash(buildHashRoute(route.page, route.authMode));

			expect(readHashRoute()).toEqual(route);
		}
	});

	it('defaults to the login variant of the auth page', () => {
		expect(buildHashRoute('auth')).toBe('#/auth/login');
	});
});
