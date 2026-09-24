# 提示词 G：把研究中发现的好源登记进配置

> 用途：当 AI 通过浏览器调研、或在与用户对话中发现「列表之外的优质来源/网页」时，主动询问并帮助用户把它沉淀到检索配置里，方便以后复用。

## 触发场景
- 浏览器调研（agent-browser / 网页抓取）找到一个不在 `platforms.json` 里的好站、好索引、好报告。
- 用户说"这个网站不错""以后还想用这个源""把它存下来"。
- 用户手头有一个想纳入固定检索流程的网址。

## 对话流程（务必先问再写）
1. **判断来源类型**，再决定登记方式：
   - **可检索的搜索源**（有搜索框/搜索 URL，能接受关键词）→ 登记为「平台」，URL 模板需含 `{q}` 占位符。
   - **固定好书签**（某篇报告 / 某页面，不接受关键词）→ 登记为「书签」，用 `--url none --link <真实地址>`。
2. **询问用户是否保存**（用 AskUserQuestion 或自然语言确认），不要默默写文件。
3. **询问保存到哪**：
   - **主配置 `platforms.json`**：适合通用、希望随 skill 一起分享/提交的平台。
   - **个人配置 `platforms.user.json`**：适合只属于你自己的私藏源，且**不会被主配置更新覆盖**。
4. 调用登记命令（或等价地直接编辑对应 JSON）：

```bash
# 登记一个可检索的搜索源（写入个人配置）
python assets/build_query.py --add "平台名称" \
    --url "https://站点/search?q={q}" \
    --category papers|datasets|code|other \
    --query generic|plain|pubmed|cnki|arxiv|scholar|none \
    --note "为什么好用" --user

# 登记一个固定好书签（写入主配置）
python assets/build_query.py --add "报告名" \
    --url none --link "https://真实地址" \
    --category papers --query none --note "有价值的实测对比"
```

5. **回显结果**：告诉用户已写入哪个文件、下次 `build_query.py` 会自动带上它。

## 字段说明
- `category`：决定 `--only` 归类（papers/datasets/code/other）。
- `query`：检索式构造方式，可选 `generic`（默认布尔串）、`plain`（仅首词空格连接，适合数据集站）、`pubmed`/`cnki`/`arxiv`（学科专用）、`none`（站内搜索/书签占位）。
- `url`：含 `{q}` 才会被替换；`none` 表示无搜索模板。
- `link`：固定地址，仅当 `url` 为 `none` 时作为可点击链接使用。

## 注意
- 重复同名会报错，请换名或修改现有条目。
- 个人配置 `platforms.user.json` 不会随主配置更新被覆盖，适合长期私藏。
