# dsh-command-approval-view

[English](README.md) | 中文

DeepSeek Harness 插件：用语法高亮重新格式化命令审批提示。无任何 AI / 网络功能——只改变待确认命令的展示方式，审批流程本身不变。

**安装或更新**：

```bash
dsh plugin --profile web remove dsh-command-approval-view
dsh plugin --profile web add github:yzhangjy/dsh-command-approval-view
```

安装后重启 web profile。

## 工作原理

当宿主需要你确认是否执行一条 shell 命令时（典型场景：沙箱 `workspace-write` → `danger-full-access` 升级，或通用 `ask` 审批策略），本插件接管 `conversation.composer` 审批提示，把待执行的命令渲染为 **语法高亮的终端视图**——标注命令名、选项、参数、字符串、环境变量、操作符、注释与续行符，全部使用 DSH 主题变量。

审批语义不变：按钮仍然是「拒绝」与「允许一次」，`answer` 仅输出 `allowed-once` 或 `rejected`，与内置面板完全一致。

## 开发

```bash
pnpm install      # 安装依赖并运行 prepare 构建
pnpm run build    # tsdown（Host ESM + Client CJS 闭包）
pnpm run typecheck
```