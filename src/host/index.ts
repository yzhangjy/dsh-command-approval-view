/**
 * Host half of dsh-command-approval-view.
 *
 * All behavior lives in the client (syntax-highlighted approval view); the
 * host row exists only so the bundle patch mounts this package cleanly.
 */

export const name = 'command-approval-view'
export const inject: string[] = []

export function apply(): void {}
