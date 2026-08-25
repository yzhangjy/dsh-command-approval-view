//#region src/host/index.d.ts
/**
 * Host half of dsh-command-approval-view.
 *
 * All behavior lives in the client (syntax-highlighted approval view); the
 * host row exists only so the bundle patch mounts this package cleanly.
 */
declare const name = "command-approval-view";
declare const inject: string[];
declare function apply(): void;

//#endregion
export { apply, inject, name };