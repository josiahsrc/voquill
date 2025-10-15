/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	testTimeout: 10000,
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	globals: {
		"ts-jest": {
			useESM: true,
			tsconfig: "./tsconfig.test.json",
		},
	},
};
