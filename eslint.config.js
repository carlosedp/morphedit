import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist', '**/build', '**/docs', '**/coverage', '**/*.md'],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [
      eslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'sort-destructure-keys': sortDestructureKeys,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },

    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'sort-imports': 'off',
      'no-unused-vars': 'off',
      'import/first': 'error',
      'import/no-dynamic-require': 'warn',
      'import/no-nodejs-modules': 'warn',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      'import/order': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'sort-destructure-keys/sort-destructure-keys': 'error',
    },
  }
);
