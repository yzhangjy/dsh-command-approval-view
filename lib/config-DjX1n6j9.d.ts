//#region src/config.d.ts
/**
 * Configuration types and defaults for the dsh-command-approval-view plugin.
 *
 * @module dsh-command-approval-view/config
 */
interface ExplainerConfig {
  /** Master switch for the whole plugin. */
  enabled: boolean;
  /**
   * Provider route used for the model explanation. Empty means "fall back to
   * the current default model selection" (`agentDefaultModel.currentSelection()`).
   */
  provider: string;
  /**
   * Model id used for the model explanation. Empty means "fall back to the
   * current default model selection".
   */
  model: string;
  /**
   * System prompt for the explainer. Empty means the built-in default prompt.
   * The command text is sent separately as user content, so this prompt must
   * not rely on a `{{command}}` placeholder.
   */
  prompt: string;
  /** Hard deadline for one model explanation, in milliseconds. */
  timeoutMs: number;
  /** Output token cap for the explanation call. */
  maxTokens: number;
}
declare const DEFAULT_CONFIG: ExplainerConfig;
/** Merge a partial row config over defaults, keeping flat fields standalone. */
declare function resolveConfig(partial?: Partial<ExplainerConfig>): ExplainerConfig; //#endregion
export { DEFAULT_CONFIG as DEFAULT_CONFIG$1, ExplainerConfig, resolveConfig as resolveConfig$1 };