/** Jest (Node) para @firebase/rules-unit-testing; ejecutar vía npm run test:firestore-rules */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/firestore-tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
      },
    ],
  },
  testTimeout: 120000,
};
