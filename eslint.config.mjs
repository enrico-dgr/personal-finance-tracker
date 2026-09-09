import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'**/dist/**',
			'**/node_modules/**',
			'apps/web/vite.config.js',
			'apps/web/vite.config.d.ts',
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			// The codebase deliberately prefixes intentionally unused bindings with _.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrors: 'none',
				},
			],
			eqeqeq: ['error', 'smart'],
			'no-console': 'off',
		},
	},
	{
		files: ['apps/api/**/*.ts', 'prisma/**/*.ts'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['apps/web/**/*.{ts,tsx}'],
		languageOptions: {
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			// The dashboard derives state inside effects in several long-standing
			// places. Keep these visible as warnings instead of blocking CI on a
			// refactor that would change runtime behaviour.
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/exhaustive-deps': 'warn',
		},
	}
);
