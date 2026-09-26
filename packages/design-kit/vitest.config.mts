import { defineConfig } from 'vitest/config';
// Pages are only parsed in tests, never run: no scripts, no stylesheet downloads.
export default defineConfig({ test: { environment: 'happy-dom', include: ['test/**/*.test.ts'], environmentOptions: { happyDOM: { settings: {
  disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableIframePageLoading: true, handleDisabledFileLoadingAsSuccess: true,
} } } } });
