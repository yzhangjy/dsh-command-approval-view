import { ExplainerConfig } from "./config-DjX1n6j9.js";
import { Context } from "@deepseek-ai/cordis";

//#region src/host/index.d.ts

declare const name = "command-approval-view";
/** Hard dependency: the model-call API used for the explanation. */
declare const inject: string[];
declare const DEFAULT_PROMPT: string;
declare function apply(ctx: Context, rawConfig?: Partial<ExplainerConfig>): void; //#endregion
export { DEFAULT_PROMPT, apply, inject, name };