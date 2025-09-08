import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src-tauri/', '/src-wasm/'],
  moduleNameMapper: Object.assign(
    {
      // CSS modules and style imports -> mock
      '^.+\\.(css|less|sass|scss)$': '<rootDir>/src/__mocks__/styleMock.ts',
      // Static assets -> mock
      '^.+\\.(png|jpg|jpeg|svg|gif|webp|avif|ico)$': '<rootDir>/src/__mocks__/fileMock.ts',
    },
    // Map TS path aliases from tsconfig if present (guarded)
    ((): Record<string, string> => {
      const paths = (compilerOptions as any).paths;
      if (!paths) return {};
  return (pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }) || {}) as Record<string, string>;
    })()
  ),
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx|js)$',
  verbose: true,
};

export default config;
