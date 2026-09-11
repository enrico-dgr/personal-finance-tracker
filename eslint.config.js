import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    'migrations/**',
    '.agents/**',
    '.claude/**',
    '.cursor/**',
    '.devin/**',
    'apps/api/src/prisma/contract.d.ts',
    'apps/web/vite.config.js',
    'apps/web/vite.config.d.ts',
  ]),
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
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
    settings: {
      react: {
        version: "19.1",
        defaultVersion: "19.1",
        pragma: "React",
      },
    },
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: globals.browser,
    },
    plugins: pluginReact.configs.flat.recommended.plugins,
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  }
]);
