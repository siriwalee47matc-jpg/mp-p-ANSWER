import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 15,
      functions: 15,
      lines: 20,
    },
  },
  testEnvironment: 'node',
};

export default config;
