//#region src/config.ts
const DEFAULT_CONFIG = {
	enabled: true,
	provider: "",
	model: "",
	prompt: "",
	timeoutMs: 2e4,
	maxTokens: 500
};
/** Merge a partial row config over defaults, keeping flat fields standalone. */
function resolveConfig(partial) {
	return {
		...DEFAULT_CONFIG,
		...partial ?? {}
	};
}

//#endregion
export { DEFAULT_CONFIG, resolveConfig };