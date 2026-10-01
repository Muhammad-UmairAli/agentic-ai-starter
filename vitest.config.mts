import { defineConfig } from "vitest/config";

// Tests always run offline, even if a real API key is in the shell.
export default defineConfig({ test: { env: { AI_MODE: "mock" } } });
