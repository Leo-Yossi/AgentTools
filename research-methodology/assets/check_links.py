# -*- coding: utf-8 -*-
"""批量校验 md 文档中的外链可达性。"""
import re
import os
import sys
import json
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
import ssl

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# 关闭证书校验：链接检查器面对大量站点，部分使用自签/过期证书或会触发 SNI 问题；
# 关闭后可避免把"证书坏掉但站点正常"误判为不可达。代价是可能把"证书坏掉"也判为可达，
# 因此结果仅供人工复核参考，不据此自动删除链接。
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

TIMEOUT = 12


def extract_urls(path):
    text = open(path, encoding="utf-8").read()
    # markdown [x](url)：允许 URL 内出现一层括号（如 Wikipedia / arXiv 摘要页）
    urls = re.findall(r'\]\((https?://(?:[^()\s]|\([^()\s]*\))*)\)', text)
    # bare <url>
    urls += re.findall(r'<(https?://[^>\s]+)>', text)
    out = []
    seen = set()
    for u in urls:
        u = u.rstrip('.,;)>')
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def check(url):
    for method in ("HEAD", "GET"):
        try:
            req = Request(url, method=method, headers={
                "User-Agent": UA,
                "Accept": "*/*",
            })
            resp = urlopen(req, timeout=TIMEOUT, context=CTX)
            return url, resp.getcode(), resp.geturl()
        except HTTPError as e:
            if method == "HEAD" and e.code in (403, 405, 400, 501):
                continue
            return url, e.code, url
        except URLError as e:
            reason = str(getattr(e, "reason", e))
            if method == "HEAD":
                continue
            return url, "ERR:" + reason[:80], url
        except Exception as e:  # noqa
            if method == "HEAD":
                continue
            return url, "ERR:" + type(e).__name__ + ":" + str(e)[:60], url
    return url, "ERR:unknown", url


def main():
    files = sys.argv[1:]
    allurls = []
    for f in files:
        for u in extract_urls(f):
            allurls.append((os.path.basename(f), u))
    print(f"共 {len(allurls)} 个链接待校验\n", flush=True)
    results = []
    with ThreadPoolExecutor(max_workers=16) as ex:
        for (fn, u), (_, code, final) in zip(allurls, ex.map(lambda t: check(t[1]), allurls)):
            results.append((fn, u, code, final))
            flag = ""
            if isinstance(code, int):
                if code >= 400:
                    flag = "  <<< 需核查"
            else:
                flag = "  <<< 需核查"
            print(f"{fn:24s} {str(code):28s} {u}{flag}", flush=True)
    bad = [r for r in results if r[2] == 404 or (isinstance(r[2], str) and "Name or service" in str(r[2])) or (isinstance(r[2], int) and r[2] >= 400)]
    print("\n===== 疑似失效链接 =====")
    for fn, u, code, final in bad:
        print(f"{fn}\t{code}\t{u}")
    print(f"\n合计: 总 {len(results)}，疑似失效 {len(bad)}")


if __name__ == "__main__":
    main()
