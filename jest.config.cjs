const { readFileSync } = require("fs");
const { pathsToModuleNameMapper } = require("ts-jest");

const path = require("path");
// tsconfig.json may contain comments (JSONC). Remove common comment patterns before parsing.
const rawTs = readFileSync(path.join(__dirname, "tsconfig.json"), "utf8");
const stripComments = (s) =>
  s.replace(/\/\*[^]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const tsconfig = JSON.parse(stripComments(rawTs));
const compilerOptions = tsconfig.compilerOptions || {};

module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/src-tauri/",
    "/src-wasm/",
  ],
  moduleNameMapper: Object.assign(
    {
      "^.+\\.(css|less|sass|scss)$": "<rootDir>/src/__mocks__/styleMock.ts",
      "^.+\\.(png|jpg|jpeg|svg|gif|webp|avif|ico)$":
        "<rootDir>/src/__mocks__/fileMock.ts",
    },
    pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: "<rootDir>/",
    }) || {}
  ),
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx|js)$",
  verbose: true,
};
