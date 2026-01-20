import { defineConfig } from "vitest/config";

import { resolve } from "path";

export default defineConfig({
	ssr: {
		noExternal: [
			"@firemix/mixed",
			"@firemix/core",
			"@firemix/admin",
			"@firemix/client",
		],
	},
	resolve: {
		alias: {
			"firebase/app": resolve(__dirname, "node_modules/firebase/app"),
			"firebase/auth": resolve(__dirname, "node_modules/firebase/auth"),
			"firebase/firestore": resolve(__dirname, "node_modules/firebase/firestore"),
			"firebase/functions": resolve(__dirname, "node_modules/firebase/functions"),
			"firebase/storage": resolve(__dirname, "node_modules/firebase/storage"),
			"firebase/database": resolve(__dirname, "node_modules/firebase/database"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		include: ["src/**/*.test.ts", "test/**/*.test.ts"],
		setupFiles: ["./test/helpers/globalSetup.ts"],
		testTimeout: 10_000,
		hookTimeout: 10_000,
		pool: "threads",

		// Firebase emulator only handles one function at a time, so run specs sequentially.
		fileParallelism: false,
		maxConcurrency: 3,
	},
});
