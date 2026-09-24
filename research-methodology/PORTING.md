# 安装到各 Agent

本 skill 是框架中立的：`SKILL.md` 只用 `name` / `description` 两个通用字段，提示词是纯文本，脚本是纯 Python 标准库（无需 `pip install`）。

## WorkBuddy
把整个 `research-methodology/` 文件夹放到：
- 用户级：`~/.workbuddy/skills/research-methodology/`
- 或项目级：`<项目>/.workbuddy/skills/research-methodology/`

WorkBuddy 会自动识别根目录下的 `SKILL.md`，无需额外配置。

## Claude Code (cc)
- 项目级：`<仓库>/.claude/skills/research-methodology/`
- 全局：`~/.claude/skills/research-methodology/`

建议在 `CLAUDE.md` 加一句："调研类任务优先使用 research-methodology skill。"

## Codex (OpenAI)
- 项目级：`codex/skills/research-methodology/`
- 或在 `AGENTS.md` 中引用本目录，让 agent 在调研时读取 `SKILL.md` 与 `references/`。

## 通用要点
- 任意支持 SKILL.md 的 agent：直接复制文件夹，确保 `SKILL.md` 在根目录即可。
- 脚本运行（跨平台，仅需 Python 3.8+，无第三方依赖）：
  ```bash
  python assets/build_query.py "A|a1|a2" "B|b1" --md
  python assets/check_links.py references/*.md
  ```
- 维护：以 `references/` 为主文档，新增资源请回填对应章节并运行 `check_links.py` 复检外链。
- 部署即复制：把 `research-methodology/` 整目录复制到目标 agent 的 skills 目录即可，内部全部使用相对路径，无需修改任何文件。
- 检索平台清单与查询构造逻辑已分离：`assets/platforms.json` 是平台数据源（增删平台只改这里），`assets/build_query.py` 仅负责查询串构造与渲染，二者均不依赖任何写死的绝对路径。
- 个人配置叠加：`assets/platforms.user.json`（可选）会自动合并到主配置之上，且**不会被主配置更新覆盖**，专门存放你自己在调研中收藏的好源。可参考 `assets/platforms.user.example.json` 模板新建。登记新源用 `python assets/build_query.py --add "名称" --url "..." [--user]`（详见 `prompts/G-add-platform.md`）。
