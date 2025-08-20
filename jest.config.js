module.exports = {
  displayName: "Dessai Backend Tests",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**/*",
    "!src/prisma/**/*"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup/jest.setup.ts"
  ],
  moduleFileExtensions: [
    "ts",
    "js",
    "json"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  modulePathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/"
  ]
};
