---
name: research-methodology
description: 通用科研/技术调研方法论。当用户需要系统性开展一项调研（找论文、找数据集、判断产业落地、做文献综述、技术选型、竞品分析、找 SOTA 基线、评估数据可用性）时使用。适用于"帮我调研一下 X""这个方向做到哪了""有哪些数据集/论文/开源方案""调研架空线驱鸟监测"等请求。提供从自然语言想法→关键词→各平台检索式→多源检索→筛选分级→产出调研报告的完整可复用流程，含中英术语对齐、检索式构造、提示词模板与批量生成检索链接的脚本。
---

# 科研调研方法论（通用全领域）

> 一套"去哪找数据、去哪找论文、去哪看落地现状"的索引 + 可复用调研执行流程（SOP）。
> 本 skill 与具体 agent 工具无关：提示词是纯文本，脚本是纯 Python 标准库，可在 WorkBuddy / Claude Code / Codex 等任意支持 SKILL.md 的 agent 中使用。

## 何时使用
- 接到一个陌生课题，需要从 0 到 1 走完一次调研
- 要找论文 / 数据集 / 代码 / 产业落地现状 / 竞赛榜单 / SOTA 基线
- 关键词拿不准、搜太多或太少、搜跑偏时
- 要做文献综述、技术选型、竞品分析、可行性判断

## 目录结构
```
research-methodology/
├── SKILL.md                       # 本文件（入口与路由）
├── references/                    # 方法论正文（按需读取）
│   ├── 00-README.md               # 文档地图 + 总决策树 + 链接卫生记录
│   ├── 01-数据集调研.md           # 去哪找训练/验证/测试数据
│   ├── 02-论文调研.md             # 去哪找论文、顶会顶刊、检索语法
│   ├── 03-线下渠道调研.md         # 展会/竞赛/会议/产业活动
│   ├── 04-调研工作流SOP.md        # 8 阶段可执行流程 + 模板 + 质控
│   └── 05-搜索方法与查询构造.md   # 想法→关键词→检索式→多源路由
├── prompts/                       # 可直接复制给 AI 的提示词模板
│   ├── A-intent-parse.md          # 意图解析（7 要素）
│   ├── B-keyword-extract.md       # 关键词提取与术语对齐
│   ├── C-query-gen.md             # 多源检索式生成
│   ├── D-query-fix.md             # 结果反馈与查询修正
│   ├── E-one-shot.md              # 一站式（日常推荐）
│   ├── F-analysis.md              # 论文速读/对比/缺口/反方
│   ├── G-add-platform.md          # 把研究中发现的好源登记进配置
│   └── H-materialize.md           # 框架续跑：占位/锚点 → 具体资源条目（带链接）
├── assets/                        # 配套脚本（纯 Python 标准库）
│   ├── build_query.py             # 关键词 → 各平台检索链接（从 platforms.*.json 读取）
│   ├── platforms.json             # 主配置（随 skill 发布，可被更新覆盖）
│   ├── platforms.user.json        # 个人配置（可选，自动合并，永被主配置更新冲掉）
│   ├── platforms.user.example.json# 个人配置模板（复制为上面文件名后按需改）
│   └── check_links.py             # 批量校验 md 外链可达性
└── PORTING.md                     # 如何安装到 WB / CC / Codex
```

## 调用后执行协议（agent 用）

> 本 skill 被触发时，**不要只复述方法论**，请按以下顺序真正行动起来：

1. **意图解析 + 检索构造（默认一步到位）**：读取 `prompts/E-one-shot.md`，把用户原始想法拆成 7 要素、产出中英关键词与各平台检索式。若只需中间产物（例如只要关键词、或只要查询修正），分别用 `prompts/A / B / C / D`。
2. **批量出链接**：把关键词交给脚本（平台清单来自 `assets/platforms.json`，自动叠加 `platforms.user.json`）：
   ```bash
   python assets/build_query.py "概念A|a1|a2" "概念B|b1" --md
   ```
3. **按 SOP 分阶段推进**：读取 `references/04-调研工作流SOP.md`，按 8 阶段执行，每阶段套用其内置模板。资源索引 `references/01~03` 按需读对应章节即可，**不要一次性全读**以省 token。阶段 0~1.5 产出的是**框架**（任务书 / 术语表 / 关键词 / 检索式 / 各节占位或检索锚点），还不是具体资源。
4. **框架续跑（落到具体资源）**：若用户已有框架/任务书并说"继续 / 跑 phases 2/3/5 / materialize / 续跑"，读取 `prompts/H-materialize.md` 与 `references/04` §11，把数据集/论文章节的**占位与检索锚点落实为带真实链接的具体条目**（✅公开 / ⚠️学术自建不公开但方法可复用 / ❓许可不明）。这一步是 agent **联网执行**，不是脚本——`build_query.py` 只给检索入口，具体资源靠本步产出。
5. **迭代修正**：结果太多 / 太少 / 跑偏时，用 `prompts/D-query-fix.md` 与 `references/05-搜索方法与查询构造.md` 第 8 节修正。
6. **⚠️ 确认产物落盘位置（必须询问用户）**：默认把最终产物写到**当前工作区**的 `<课题名>/` 目录（结构见 `references/04` §7）。在正式落盘前，**必须用 AskUserQuestion 询问用户是否沿用默认目录**；若用户要更换，由用户自行指定任意文件夹路径，再据此落盘。
7. **产出归档**：套用 `references/04` 的报告骨架生成调研报告与清单，并把本次新增的通用资源回填到 `references/01~03`。

> 提示词模板以 `prompts/` 为唯一真源；`references/05` §6 与 `references/04` §10 仅作引用，修改请以 `prompts/` 为准。

## 标准工作流（速查）
1. **意图解析**：用 `prompts/A-intent-parse.md`，把大白话拆成 7 要素。
2. **检索构造**：用 `prompts/B-keyword-extract.md` + `prompts/C-query-gen.md` 产出中英关键词与各平台检索式；或一步到位用 `prompts/E-one-shot.md`。
3. **批量出链接**：把关键词交给脚本（平台清单在 `assets/platforms.json`，自动叠加 `platforms.user.json`）——
   ```bash
   python assets/build_query.py "概念A|a1|a2" "概念B|b1" --md
   # 指定自定义主配置：python assets/build_query.py "A|a1" "B|b1" --config /path/to/platforms.json
   ```
4. **（可选）收藏研究中发现的好源**：浏览器调研时若找到列表之外、结果又好的网页/平台，参考 `prompts/G-add-platform.md` 先询问用户，再视情况登记进主配置或个人配置，方便以后复用：
   ```bash
   # 登记可检索的搜索源（写入个人配置）
   python assets/build_query.py --add "平台名" --url "https://站点/search?q={q}" \
       --category papers --query generic --note "为什么好用" --user
   # 登记固定好书签（写入主配置）
   python assets/build_query.py --add "报告名" --url none --link "https://真实地址" \
       --category papers --query none --note "有价值的实测对比"
   ```
5. **多源检索 + 筛选分级**：按 `references/04-调研工作流SOP.md` 的 8 阶段执行，用其内置模板与质控清单。
6. **迭代修正**：结果太多/太少/跑偏时，按 `prompts/D-query-fix.md` 与 `references/05-搜索方法与查询构造.md` 第 8 节修正。
7. **产出归档**：套用 04 的报告骨架，把新增资源回填 `references/01~03`。

## 路由速查（该去哪）
- 不知道搜什么 → `references/05-搜索方法与查询构造.md`
- 完全陌生、找术语 → `references/02-论文调研.md`
- 找"别人做到哪" → `references/02-论文调研.md`（arXiv + Semantic Scholar + Research Rabbit）
- 找"能跑的数据" → `references/01-数据集调研.md`
- 找"产业落地" → `references/03-线下渠道调研.md`
- 形成可交付结论 → `references/04-调研工作流SOP.md`

## 注意
- 链接卫生用 `python assets/check_links.py references/*.md` 校验；403/404 多数为 WAF 拦截，需用浏览器 UA 复测，勿直接判失效。
- 商用项目务必先确认数据集许可（`references/01-数据集调研.md` 第 7 节）。
- **产物落盘**：默认写到当前工作区的 `<课题名>/` 目录，但落盘前必须用 AskUserQuestion 确认用户是否更换；更换时由用户自行指定路径。
- **维护归属**：agent 实际加载的是安装目录里的副本（如 `~/.workbuddy/skills/research-methodology/`）。从本工作区编辑后，需复制 / 软链同步到安装目录才会生效，避免两份漂移。
