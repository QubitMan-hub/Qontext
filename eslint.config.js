import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'figma-plugin/dist/**', 'legacy/**', 'node_modules/**', 'python/**', 'film/node_modules/**', 'film/out/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  { files: ['scripts/**', 'tests/**', 'film/scripts/**', 'eslint.config.js'], languageOptions: { globals: { ...globals.node } } },
  { files: ['figma-plugin/src/**'], languageOptions: { globals: { figma: 'readonly', __html__: 'readonly' } } },
];
