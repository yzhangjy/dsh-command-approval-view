# dsh-command-approval-view

English | [中文](README.zh.md)

DeepSeek Harness plugin: reformat command-approval prompts with syntax highlighting. No AI/network features — it only changes how the pending command is displayed; the approval flow itself is untouched.

**Install or update**:

```bash
dsh plugin --profile web remove dsh-command-approval-view
dsh plugin --profile web add github:yzhangjy/dsh-command-approval-view
```

Then restart the web profile.

## What it does

When the host needs you to confirm whether to execute a shell command (typical scenario: sandbox `workspace-write` → `danger-full-access` escalation, or the general `ask` approval policy), this plugin takes over the `conversation.composer` approval prompt and renders the pending command as a **syntax-highlighted terminal view** — annotating keywords, options, arguments, strings, environment variables, operators, comments, and line continuations, all via DSH theme variables.

Approval semantics are untouched: the buttons remain "Reject" and "Allow Once", and `answer` only emits `allowed-once` or `rejected`, exactly like the built-in panel.

## Development

```bash
pnpm install      # installs deps and runs the prepare build
pnpm run build    # tsdown (host ESM + client CJS closure)
pnpm run typecheck
```