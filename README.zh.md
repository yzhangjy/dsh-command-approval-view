# dsh-command-approval-view

[English](README.md) | 中文

DeepSeek Harness 插件：接管命令审批提示，添加语法高亮展示与可配置的模型解释。

**安装或更新**：

```bash
dsh plugin --profile web add github:yzhangjy/dsh-command-approval-view
```

安装后重启 web profile。

## 工作原理

当宿主需要你确认是否执行一条 shell 命令时（典型场景：沙箱 `workspace-write` → `danger-full-access` 升级，或 get `ask` 审批策略），本插件接管 `conversation.composer` 审批提示，渲染为：

1. **语法高亮的命令** — 等宽终端视图，标注命令名、选项、参数、字符串、环境变量、操作符、注释与续行符，全部使用 DSH 主题变量。
2. **即时词库解释**（确定性、无网络）— 解释了每个被识别的命令做什么。
3. **模型生成解释**（可选）— 如果 `commandExplainer` 服务已连线，将在词库解释之外追加一段模型生成的中文说明。

审批语义不变：按钮仍然是「拒绝」与「允许一次」，`answer` 仅输出 `allowed-once` 或 `rejected`。

## 配置项

这些值在 `cordis.patch.yml` 的 `config` 块中设置：

| 配置键 | 默认值 | 说明 |
|---|---|---|
| `enabled` | `true` | 是否启用本插件。 |
| `provider` | `''`（使用默认模型） | 用于模型解释的 provider 路由。 |
| `model` | `''`（使用默认模型） | 用于模型解释的 model id。 |
| `prompt` | `''`（使用内置提示词） | 模型解释器的系统提示词。命令作为用户内容发送。 |
| `timeoutMs` | `20000` | 模型解释调用的硬超时（毫秒）。 |
| `maxTokens` | `500` | 模型解释的最大输出 token。 |

## 开发

```bash
pnpm install      # 安装依赖并运行 prepare 构建
pnpm run build    # tsdown（Host ESM + Client CJS 闭包）
pnpm run typecheck
```

Typert Remote 描述符（`lib/typert.host.js`、`lib/typert.remote-client.js`）镜像 `@deepseek-ai/dsh-typert-generator` 从 `CommandExplainerService` 上的 `@Remote` 装饰器生成的输出；远程接口变更时应在 monorepo 构建中重新生成。