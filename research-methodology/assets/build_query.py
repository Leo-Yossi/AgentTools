# -*- coding: utf-8 -*-
"""
把关键词批量转换成各平台的检索链接。

平台定义来自同目录下的配置文件（配置即数据）：
  - platforms.json        主配置（随 skill 发布，可被更新覆盖）
  - platforms.user.json   个人配置（可选，自动合并到主配置之上，专门存放你
                          在调研中自己发现并收藏的好源，不会被主配置更新冲掉）
新增 / 修改检索平台只需编辑对应 JSON（或用 --add 命令登记），无需改动本脚本。

用法:
  # 生成检索链接
  python build_query.py "肺结节|pulmonary nodule" "良恶性|malignancy" --md

  # 把研究中发现的好源登记进配置
  python build_query.py --add "某聚合检索站" --url "https://x.com/search?q={q}" \
        --category papers --query generic --note "覆盖面广" [--user]
  # 收藏一个固定好书签（非搜索引擎）
  python build_query.py --add "鸟类监测评测报告" --url none \
        --link "https://example.com/report" --category papers \
        --query none --note "很有价值的实测对比" [--user]

规则:
  - 概念组内用 `|` 分隔同义词（组内 OR）；概念组之间为 AND
  - 只给一个词时自动加引号做精确匹配
  - URL 模板须含 {q} 占位符（纯站内搜索用 --url none 配合 --link）

选项:
  --config PATH   指定主配置文件（默认: 脚本同目录 platforms.json；指定后不再自动叠加 user 文件）
  --only papers|datasets|code|all   只输出某一类平台（默认 all）
  --md           输出 Markdown 表格
  --plain        只输出可直接复制的检索式文本（不含 URL）
  --add NAME     登记新平台/书签到配置（NAME 为平台名）；其余 --url/--link/--category/--query/--note/--user 配套使用
  --user         与 --add 配合：写入个人配置 platforms.user.json（而非主配置）
"""
import sys
import os
import json
import argparse
from urllib.parse import quote

# ---------- 查询串构造逻辑（由配置中的 query 字段引用） ----------

def q_generic(concepts, quote_terms=True):
    """通用布尔串: (a OR b) AND (c)"""
    parts = []
    for group in concepts:
        if len(group) == 1:
            term = f'"{group[0]}"' if quote_terms else group[0]
            parts.append(term)
        else:
            if quote_terms:
                parts.append("(" + " OR ".join(f'"{w}"' for w in group) + ")")
            else:
                parts.append("(" + " OR ".join(group) + ")")
    return " AND ".join(parts)


def q_plain(concepts):
    """只用每组的第一个核心词，空格连接 —— 适合数据集平台"""
    return " ".join(g[0] for g in concepts)


def q_pubmed(concepts):
    parts = []
    for group in concepts:
        parts.append("(" + " OR ".join(f'{w}[Title/Abstract]' for w in group) + ")")
    return " AND ".join(parts)


def q_cnki(concepts):
    """知网高级检索式: SU=('A'+'B') AND SU=('C')"""
    parts = []
    for group in concepts:
        if len(group) == 1:
            parts.append(f"SU='{group[0]}'")
        else:
            parts.append("SU=(" + "+".join(f"'{w}'" for w in group) + ")")
    return " AND ".join(parts)


def q_arxiv(concepts):
    """arXiv 新版搜索支持 all: 字段与布尔"""
    parts = []
    for group in concepts:
        parts.append("(" + " OR ".join(f'all:"{w}"' for w in group) + ")")
    return " AND ".join(parts)


def q_scholar(concepts):
    return q_generic(concepts)


def q_none(concepts):
    """无 URL 模板、需站内搜索 / 固定书签的占位"""
    return "（站内搜索：" + q_plain(concepts) + "）"


# 配置 query 字段 → 查询串构造函数的注册表
QUERY_FUNCS = {
    "generic": q_generic,
    "plain": q_plain,
    "pubmed": q_pubmed,
    "cnki": q_cnki,
    "arxiv": q_arxiv,
    "scholar": q_scholar,
    "none": q_none,
}

# --plain 模式展示的标准检索式集合（引用上面的注册表）
PLAIN_PRESET = [
    ("通用布尔式", "generic"),
    ("arXiv", "arxiv"),
    ("PubMed", "pubmed"),
    ("CNKI", "cnki"),
    ("数据集平台", "plain"),
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CATEGORIES = ["papers", "datasets", "code", "other"]


# ---------- 配置加载 / 保存 ----------

def _read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_one(path):
    if not os.path.exists(path):
        return []
    data = _read_json(path)
    return data.get("platforms", [])


def load_platforms(config_path=None, include_user=True):
    """加载平台定义。

    - config_path 为 None：读脚本同目录 platforms.json，并自动叠加 platforms.user.json
      （个人配置按 name 覆盖主配置同名校验项，其余追加在末尾）。
    - config_path 指定时：仅以该文件为准，不再叠加 user 文件。
    全程基于脚本所在目录定位，无需写死任何路径。
    """
    if config_path is not None:
        cfg = os.path.abspath(config_path)
        if not os.path.exists(cfg):
            sys.exit("[错误] 未找到配置文件: {}".format(cfg))
        return _load_one(cfg)

    base_path = os.path.join(SCRIPT_DIR, "platforms.json")
    if not os.path.exists(base_path):
        sys.exit("[错误] 未找到主配置文件: {}\n        请用 --config 指定，或在同目录放置 platforms.json。".format(base_path))
    base = _load_one(base_path)

    user_path = os.path.join(SCRIPT_DIR, "platforms.user.json")
    user = _load_one(user_path) if os.path.exists(user_path) else []

    # 按 name 合并：个人配置覆盖主配置的同名项，其余追加在末尾
    by_name = {p.get("name"): p for p in base}
    for p in user:
        by_name[p.get("name")] = p
    seen = set()
    merged = []
    for p in base:
        n = p.get("name")
        if n not in seen:
            merged.append(by_name[n]); seen.add(n)
    for p in user:
        n = p.get("name")
        if n not in seen:
            merged.append(p); seen.add(n)

    for p in merged:
        qt = p.get("query", "generic")
        if qt not in QUERY_FUNCS:
            sys.exit("[错误] 平台 '{}' 的 query 类型 '{}' 未注册。可选: {}".format(
                p.get("name", "?"), qt, ", ".join(QUERY_FUNCS)))
    return merged


def _save_one(path, entry):
    """把一条平台定义追加写入 path（path 不存在则新建）。"""
    data = _read_json(path) if os.path.exists(path) else {"platforms": []}
    platforms = data.get("platforms", [])
    for existing in platforms:
        if existing.get("name") == entry["name"]:
            sys.exit("[错误] 配置中已存在同名平台 '{}'，请换名或修改现有条目。".format(entry["name"]))
    platforms.append(entry)
    data["platforms"] = platforms
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def add_platform(name, url_raw, link, category, query, note, to_user):
    """登记一条平台/书签到配置，返回写入的文件路径。"""
    if not name:
        sys.exit("[错误] --add 需要平台名（NAME）。")

    # 解析 url
    url = None
    if url_raw is not None:
        if url_raw.strip().lower() == "none":
            url = None
        elif "{q}" not in url_raw:
            sys.exit("[错误] --url 模板须包含 {q} 占位符（纯站内搜索请用 --url none 配合 --link）。")
        else:
            url = url_raw

    if url is None and not link:
        sys.exit("[错误] 请提供 --url（含 {q} 的检索模板），或 --url none --link <固定地址>。")

    entry = {"category": category, "name": name, "query": query}
    if url is not None:
        entry["url"] = url
    if link:
        entry["link"] = link
    if note:
        entry["note"] = note

    path = os.path.join(SCRIPT_DIR, "platforms.user.json" if to_user else "platforms.json")
    _save_one(path, entry)
    return path


# ---------- 概念解析 ----------

def parse_concepts(raw_concepts):
    """[['a','b'],['c']]"""
    return [[w.strip() for w in c.split("|") if w.strip()] for c in raw_concepts if c.strip()]


# ---------- 构建输出 ----------

def build(concepts, platforms, only="all", as_md=False):
    rows = []
    for p in platforms:
        cat = p.get("category", "other")
        name = p.get("name", "?")
        note = p.get("note", "")
        qt = p.get("query", "generic")
        fn = QUERY_FUNCS[qt]
        if only != "all" and cat != only:
            continue
        query = fn(concepts)
        url = p.get("url")
        if url:
            url = url.format(q=quote(query))
        elif p.get("link"):
            url = p["link"]  # 固定书签，不做 {q} 替换
        else:
            url = None
        if as_md:
            link = f"[打开]({url})" if url else "—"
            rows.append(f"| {cat} | {name} | `{query}` | {link} | {note} |")
        else:
            rows.append(f"[{cat:8s}] {name}\n    检索式: {query}\n    URL:    {url if url else '见备注: ' + note}\n    备注:   {note}")
    return rows


def main():
    ap = argparse.ArgumentParser(
        add_help=True,
        description="关键词 → 各平台检索链接（平台来自 platforms.json，自动叠加 platforms.user.json）",
    )
    ap.add_argument("concepts", nargs="*", help="概念组，组内同义词用 | 分隔")
    ap.add_argument("--config", default=None, help="主配置文件路径（默认: 脚本同目录 platforms.json）")
    ap.add_argument("--only", default="all", choices=["all"] + CATEGORIES)
    ap.add_argument("--md", action="store_true", help="输出 Markdown 表格")
    ap.add_argument("--plain", action="store_true", help="只输出检索式文本")
    # --add 登记模式
    ap.add_argument("--add", metavar="NAME", default=None, help="登记新平台/书签（NAME 为平台名）")
    ap.add_argument("--url", default=None, help="检索 URL 模板，须含 {q}；纯站内搜索用 'none'")
    ap.add_argument("--link", default=None, help="固定书签地址（与 --url none 配合，作为可点击链接）")
    ap.add_argument("--category", default="other", choices=CATEGORIES)
    ap.add_argument("--query", default="generic", choices=list(QUERY_FUNCS))
    ap.add_argument("--note", default="", help="备注说明")
    ap.add_argument("--user", action="store_true", help="与 --add 配合：写入个人配置 platforms.user.json")
    args = ap.parse_args()

    # 登记模式
    if args.add:
        path = add_platform(args.add, args.url, args.link, args.category, args.query, args.note, args.user)
        dest = "个人配置 platforms.user.json" if args.user else "主配置 platforms.json"
        print("[已登记] '{}' → {} （{}）".format(args.add, dest, path))
        return

    if not args.concepts:
        ap.print_help()
        sys.exit(1)

    platforms = load_platforms(args.config)
    concepts = parse_concepts(args.concepts)
    if not concepts:
        print("未解析到有效关键词")
        sys.exit(1)

    if args.plain:
        for label, qt in PLAIN_PRESET:
            print(f"{label:10s}: {QUERY_FUNCS[qt](concepts)}")
        return

    rows = build(concepts, platforms, args.only, args.md)

    if args.md:
        print("| 类别 | 平台 | 检索式 | 链接 | 备注 |")
        print("| --- | --- | --- | --- | --- |")
        print("\n".join(rows))
    else:
        print("=" * 78)
        print("核心检索式:", q_generic(concepts))
        print("=" * 78 + "\n")
        print("\n".join(rows))
        print("\n提示: 结果太多 → 增加概念组或加年份过滤；结果太少 → 减少概念组或补同义词。")


if __name__ == "__main__":
    main()
