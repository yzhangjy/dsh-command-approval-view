//#region src/host/index.ts
/**
* Host half of dsh-command-approval-view.
*
* All behavior lives in the client (syntax-highlighted approval view); the
* host row exists only so the bundle patch mounts this package cleanly.
*/
const name = "command-approval-view";
const inject = [];
function apply() {}

//#endregion
export { apply, inject, name };