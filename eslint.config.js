const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', 'coverage/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Obliga a incluir todas las deps en efectos/callbacks; previene bugs sutiles.
      'react-hooks/exhaustive-deps': 'error',
      // Sólo se permite console.* envuelto en `if (__DEV__)` o limitado a métodos seguros.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // En tests se permite cualquier console para depurar.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
