# 验证与排错

1. 在 skill 目录运行 `npm test`，覆盖分页、兼容组件、TeX、路径与构建失败保留旧输出。
2. 执行 build 后看 manifest 中页数与标题，与 Markdown 对照。编译器会拒绝静态资源缺失或联网依赖。
3. 浏览器在实际目标尺寸（通常 1440×900 或 1920×1080）逐页查看。显示所有 fragment 后检查文本、公式、表格、图片、iframe 和底部按钮有无遮挡。
4. `.slide.active` 的 `data-overflow="true"` 和右上角警示表示实际内容超出可视区。精简或拆页；投影页不能靠滚动展示。内容量静态检查只是第一道限制。
5. 在浏览器禁止外网请求，检查字体与公式；逐个测试 Demo 输入、按钮、跳转。公式是编译生成的，不需要运行 KaTeX 脚本。
6. 测试本项目选择的快捷键、fragment、按钮和页码链接。确认 Demo 内输入不会误触发翻页；使用 `serve` 保存 Markdown 后，检查浏览器刷新、页码保留和构建错误提示。

常见问题：

- `Cannot find package`：进入 skill 目录执行 `npm ci`；标准源码包首次安装需要联网，便携包已包含依赖。
- 公式报错：检查 TeX 语法，尤其是多行公式结束符，修正文稿而不是隐藏错误。
- 卡片/图片找不到：使用 `assets/...`、`demos/.../index.html`，不要使用电脑绝对路径或 `/assets/...`。
- Markdown 在 HTML 内没有渲染：原生 HTML 块不会普遍解析 Markdown，块前后加空行，或在块内部使用明确 HTML；note 和 code-card 的纯文本内容有兼容处理。
- dist 不是本工具生成：先把原目录改名保留，再构建，工具不会覆盖不明目录。
- 原子替换失败：关闭占用 dist 的程序后重试。失败时上次成功输出应仍然保留。
- 页面太密：先精简内容或拆页；不要自动统一缩小全部文字。

打包 skill 时只包含 SKILL.md、scripts、assets、references、package.json、package-lock.json。便携发行版额外包含 node_modules，保留第三方许可证；不包含任何真实课件、日志或浏览器测试文件。升级工具不应更改 projects 内 Markdown 和素材。
