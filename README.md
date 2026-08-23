# dsh-command-approval-view

English | [中文](README.zh.md)

DeepSeek Harness plugin: takes over command-approval prompts with syntax highlighting and a configurable model-generated explanation.

**Install or update**:

```bash
dsh plugin --profile web add github:yzhangjy/dsh-command-approval-view
```

Then restart the web profile.

## What it does

When the host needs you to confirm whether to execute a shell command (typical scenario: sandbox `workspace-write` → `danger-full-access` escalation, or the general `ask` approval policy), this plugin takes over the `conversation.composer` approval prompt and renders:

1. **Syntax-highlighted command** — monospace terminal view annotating keywords, options, arguments, strings, environment variables, operators, comments, and line continuations, all via DSH theme variables.
2. **Instant lexicon explanation** (deterministic, no network) — explains what each recognised sub-command does.
3. **Model-generated explanation** (optional) — when the `commandExplainer` service is wired, an additional model-generated explanation in the user's language is appended.

Approval semantics are untouched: the buttons remain "Reject" and "Allow Once", and `answer` only emits `allowed-once` or `rejected`.

## Configuration

These values live in the `config` block of `cordis.patch.yml`:

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | Whether the plugin is active. |
| `provider` | `''` (use default model) | Provider route for the model explanation. |
| `model` | `''` (use default model) | Model id for the model explanation. |
| `prompt` | `''` (use built-in prompt) | System prompt for the explainer. The command is sent as user content. |
| `timeoutMs` | `20000` | Hard deadline for one model explanation, in milliseconds. |
| `maxTokens` | `500` | Output token cap for the explanation call. |

## Development

```bash
pnpm install      # installs deps and runs the prepare build
pnpm run build    # tsdown (host ESM + client CJS closure)
pnpm run typecheck
```

The Typert Remote descriptors (`lib/typert.host.js`, `lib/typert.remote-client.js`) mirror what `@deepseek-ai/dsh-typert-generator` emits from the `@Remote` decorators on `CommandExplainerService`; regenerate them in a monorepo build if the remote face changes.