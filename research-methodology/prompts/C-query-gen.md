# 提示词 C · 多源检索式生成

基于以下关键词，请为不同平台生成可直接复制使用的检索式：

核心概念组：
A = <同义词列表>
B = <同义词列表>
C = <同义词列表>
排除：<...>

请分别给出：
1. Google Scholar 检索式（intitle/author/after 等语法）
2. arXiv 检索式（ti:/abs:/cat:/AND/OR 语法，并给出可直接访问的 URL）
3. PubMed 检索式（MeSH 术语 + 布尔语法）
4. CNKI 中国知网检索式（SU=/TI=/KY=/FT= 语法）
5. HuggingFace Datasets 与 Google Dataset Search 的检索词（各 3 个候选）
6. GitHub 检索式（含 topic/stars 过滤）
7. 语义检索用的自然语言长句（用于 Semantic Scholar / Elicit / Consensus）
每个检索式后用一句话说明会命中什么、可能漏什么。
