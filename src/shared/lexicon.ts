/**
 * Deterministic command lexicon shared by the Host fallback explainer.
 * Keys are command basenames; `args` maps short/long options to a short note.
 *
 * Pure data — safe to bundle into both halves (the client does not currently
 * consume it, but keeping it dependency-free leaves that option open).
 *
 * @module dsh-command-approval-view/shared/lexicon
 */

export interface LexEntry {
  note: string
  args?: Record<string, string>
}

export const LEXICON: Record<string, LexEntry> = {
  ls: { note: '列出目录内容', args: { '-l': '长格式', '-a': '包含隐藏项', '-la': '长格式且包含隐藏项', '-al': '长格式且包含隐藏项' } },
  cd: { note: '切换当前目录' },
  pwd: { note: '打印当前工作目录' },
  cat: { note: '输出文件内容' },
  less: { note: '分页查看文件' },
  mkdir: { note: '创建目录', args: { '-p': '递归创建父目录' } },
  rm: { note: '删除文件或目录', args: { '-r': '递归', '-f': '强制', '-rf': '递归强制删除' } },
  echo: { note: '打印文本', args: { '-n': '不输出换行符' } },
  grep: { note: '按模式搜索文本', args: { '-r': '递归搜索', '-n': '显示行号', '-i': '忽略大小写', '-l': '只列文件名' } },
  find: { note: '查找文件或目录' },
  git: { note: 'Git 版本控制操作' },
  npm: { note: 'Node.js 包管理操作', args: { install: '安装依赖', test: '运行测试' } },
  node: { note: '运行 Node.js 脚本' },
  python: { note: '运行 Python 脚本' },
  python3: { note: '运行 Python3 脚本' },
  curl: { note: '发起网络请求', args: { '-L': '跟随重定向', '-s': '安静模式', '-o': '输出到文件' } },
  wget: { note: '下载文件', args: { '-q': '安静模式', '-O': '指定输出文件' } },
  sudo: { note: '以超级用户权限执行' },
  touch: { note: '创建空文件或更新时间戳' },
  cp: { note: '复制文件或目录', args: { '-r': '递归复制' } },
  mv: { note: '移动或重命名文件' },
  chmod: { note: '修改文件权限' },
  chown: { note: '修改文件属主' },
  ps: { note: '查看进程', args: { aux: '查看全部进程' } },
  kill: { note: '终止进程' },
  which: { note: '定位可执行文件路径' },
  env: { note: '设置并执行命令（或打印环境变量）' },
  export: { note: '设置环境变量' },
  source: { note: '在当前 shell 中执行脚本' },
  test: { note: '测试条件' },
  dsh: { note: 'DeepSeek Harness 命令行工具', args: { '--profile': '指定运行 profile', '--patch': '合并 patch 配置', '--dump-config': '打印合并后配置' } },
  ln: { note: '创建文件链接', args: { '-s': '符号链接', '-f': '覆盖已存在', '-n': '不跟随已存在的符号链接', '-sfn': '强制创建符号链接' } },
  awk: { note: '按行处理文本' },
  ssh: { note: 'SSH 远程登录或执行命令' },
  scp: { note: 'SSH 安全拷贝' },
  rsync: { note: '增量同步文件' },
  tar: { note: '归档/解压文件', args: { '-czf': '压缩归档', '-xzf': '解压', '-xf': '解压' } },
  head: { note: '输出文件开头', args: { '-n': '指定行数' } },
  tail: { note: '输出文件末尾', args: { '-n': '指定行数', '-f': '持续跟踪输出' } },
  sed: { note: '流式文本替换' },
  df: { note: '查看磁盘占用', args: { '-h': '人类可读单位' } },
  du: { note: '查看目录占用', args: { '-h': '人类可读单位', '-sh': '汇总计算目录总大小' } },
}
