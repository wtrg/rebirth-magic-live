import tseslint from 'typescript-eslint';
export default [
  { ignores: ['dist/**', 'data/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
];
