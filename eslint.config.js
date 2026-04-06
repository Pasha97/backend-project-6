import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  { ignores: ['public/**', 'playwright.config.js', 'eslint.config.js'] },
  ...compat.extends('airbnb-base'),
  ...compat.extends('plugin:playwright/playwright-test').map((config) => ({
    ...config,
    files: ['**/*.spec.{js,ts}'],
  })),
  ...compat.plugins('jest'),
  ...compat.env({ node: true, jest: true, browser: true }),
  {
    rules: {
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: ['*.config.js', '*.config.cjs', 'frontend/**/*.js', '**/*.test.js', '**/*.spec.js'],
      }],
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 0,
      'import/extensions': 0,
      'new-cap': ['error', { properties: false, capIsNewExceptions: ['Fastify'] }],
      'no-param-reassign': ['error', { props: true }],
      'no-underscore-dangle': [2, { allow: ['__filename', '__dirname', '_method'] }],
    },
  },
];
