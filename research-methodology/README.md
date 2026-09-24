# Research Methodology

AgentTools 中的独立调研方法法子项目。一套「去哪找数据集、去哪找论文、去哪看产业落地现状」的索引 + 可复用调研执行流程（SOP），可整体复制到任意支持 `SKILL.md` 的 agent 中使用。

框架中立：`SKILL.md` 只用 `name` / `description` 两个通用字段，提示词是纯文本，脚本只依赖 Python 标准库（无需 `pip install`）。

## 工具目录

| 工具 | 用途 | 入口 |
|---|---|---|
| research-methodology | 从自然语言想法 → 关键词 → 各平台检索式 → 多源检索 → 筛选分级 → 调研报告 | [SKILL.md](SKILL.md) |

## 仓库结构

```text
research-methodology/
  SKILL.md                       Skill 入口与路由（agent 读这个）
  PORTING.md                     安装到 WorkBuddy / Claude Code / Codex
  references/                    方法论正文，按需读取
    00-README.md                 文档地图 + 总决策树
    01-数据集调研.md             去哪找训练/验证/测试数据
    02-论文调研.md               去哪找论文、顶会顶刊、检索语法
    03-线下渠道调研.md           展会 / 竞赛 / 会议 / 产业活动
    04-调研工作流SOP.md          8 阶段可执行流程 + 模板 + 质控
    05-搜索方法与查询构造.md     想法 → 关键词 → 检索式 → 多源路由
  prompts/                       可直接复制给 AI 的提示词模板（A~H）
  assets/                        配套脚本与平台配置
    build_query.py               关键词 → 各平台检索链接
    platforms.json               主配置（平台数据源）
    platforms.user.example.json  个人配置模板
    check_links.py               批量校验 md 外链可达性
  topics/
    架空线驱鸟监测.md            领域纵深样例：演示 skill 的两层产出模型
```

## 快速开始

需要 Python 3.8 或更新版本，无第三方依赖。先进入 `AgentTools/research-methodology`，再运行：

```sh
# 关键词 → 各平台检索链接（Markdown 输出）
python assets/build_query.py "概念A|a1|a2" "概念B|b1" --md

# 校验文档里的外链可达性
python assets/check_links.py references/*.md
```

## 与 AI 配合

让 AI 阅读 `SKILL.md`，说明调研课题，skill 会按「意图解析 → 检索构造 → 批量出链接 → 多源检索与筛选分级 → 产出归档」推进。`references/` 按需读取对应章节即可，不必全读。

两层产出模型：

- **脚本层**：`build_query.py` 给出检索入口（链接），不产出资源本身。
- **agent 层**：`prompts/H-materialize.md` 联网检索、抓取、验证，把占位与检索锚点落实为带真实链接的具体条目（标注 ✅公开 / ⚠️学术自建不公开但方法可复用 / ❓许可不明）。

`topics/架空线驱鸟监测.md` 是这套两层模型的完整实跑样例，可作为产出格式的参照。

## 个人配置

`assets/platforms.user.json`（可选）会自动合并到主配置之上，且不会被主配置更新覆盖，用来存放自己在调研中收藏的好源。可复制 `platforms.user.example.json` 新建；登记新源用：

```sh
python assets/build_query.py --add "名称" --url "https://站点/search?q={q}" --category papers --query generic --note "为什么好用" --user
```

该文件已在 `.gitignore` 中排除，不会随仓库提交。

## 安装到各 Agent

- **WorkBuddy**：整目录复制到 `~/.workbuddy/skills/research-methodology/` 或 `<项目>/.workbuddy/skills/research-methodology/`
- **Claude Code**：`<仓库>/.claude/skills/research-methodology/` 或 `~/.claude/skills/research-methodology/`
- **Codex**：`codex/skills/research-methodology/`，或在 `AGENTS.md` 中引用本目录

内部全部使用相对路径，无需修改任何文件。详见 [PORTING.md](PORTING.md)。
