import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Allow running Next.js API routes & modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    "app/api/**/*.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/*.test.ts"
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  // Fixes for ESM and Next.js imports
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Allow .ts tests
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
};

export default config;
