export type PageMode = 'dashboard' | 'rules' | 'auth';
export type AuthMode = 'login' | 'signup';

export type HashRoute = {
	page: PageMode;
	authMode: AuthMode;
};

const DEFAULT_ROUTE: HashRoute = {
	page: 'dashboard',
	authMode: 'login',
};

export function readHashRoute(): HashRoute {
	if (typeof window === 'undefined') {
		return { ...DEFAULT_ROUTE };
	}

	const normalizedHash = window.location.hash.replace(/^#\/?/, '');

	if (normalizedHash === 'rules') {
		return {
			page: 'rules',
			authMode: 'login',
		};
	}

	if (normalizedHash === 'auth' || normalizedHash === 'auth/login') {
		return {
			page: 'auth',
			authMode: 'login',
		};
	}

	if (normalizedHash === 'auth/signup') {
		return {
			page: 'auth',
			authMode: 'signup',
		};
	}

	return { ...DEFAULT_ROUTE };
}

export function buildHashRoute(page: PageMode, authMode: AuthMode = 'login') {
	if (page === 'rules') {
		return '#/rules';
	}

	if (page === 'auth') {
		return authMode === 'signup' ? '#/auth/signup' : '#/auth/login';
	}

	return '#/dashboard';
}
