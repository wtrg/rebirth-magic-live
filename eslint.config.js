import tseslint from 'typescript-eslint';
export default [
  { ignores: ['dist/**', 'data/**'] },
  ...tseslint.configs.recommended,
];
