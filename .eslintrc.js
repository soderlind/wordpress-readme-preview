module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'variableLike',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase']
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      }
    ],
    '@typescript-eslint/semi': 'warn',
  // Disable mandatory curly braces for single-line statements to reduce noise
  'curly': 'off',
    'eqeqeq': 'warn',
    'no-throw-literal': 'warn',
    'semi': 'off',
  },
  ignorePatterns: [
    'out',
    'dist',
    '**/*.d.ts'
  ],
};