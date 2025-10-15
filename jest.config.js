/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: "node",
  coverageDirectory: "./coverage",
  rootDir: "./",
  roots: ["./test"],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true
    }]
  }
};
