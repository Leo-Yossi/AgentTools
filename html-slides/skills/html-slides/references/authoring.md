# 写作规范

## 项目边界

```text
my-talk/
  brief.md            对话需求和决定，不参与编译
  slides/deck.md      投影内容（每个 md 生成一个 HTML）
  assets/            图片等本地素材
  demos/name/index.html  可选交互页面
  theme.css          可选项目样式覆盖
  slides.config.json 可选快捷键和联网设置
  dist/              自动生成，不直接编辑
```

新课件优先普通 Markdown，每个一级标题开始一页；需要明确边界时在页间用独占一行的 `---`，此时该文件按分隔线分页。代码块、note、卡片内的标题不会分页。为避免 Markdown 将 `---` 识别成 Setext 标题，分隔线前后留空行。不支持 YAML frontmatter，需求元信息放 `brief.md`。

```markdown
# 主题

这一页的核心信息。

---

# 支持这个观点的例子

- 第一个要点
- 第二个要点

<aside class="speaker-notes">
补充讲稿，默认不投影。这里用纯文本或 HTML。
</aside>
```

## 支持的内容

- 标准 Markdown：标题、列表、表格、链接、图片、代码块。
- TeX：`$x_i$` 行内公式；独占行 `$$` 包围多行公式。公式在构建时渲染，错误会中止构建并保留上次成功输出。金额中的 `$` 应写成 `\$`。
- 分步显示：`<span class="fragment">逐步出现的文字</span>`，下一步先展示 fragment 再翻页。
- 强调：`<red>重点</red>`。
- 图片：`![说明](assets/diagram.svg)`。路径相对生成目录，素材放在项目 assets。
- Demo：`<iframe src="demos/hello/index.html" width="100%" height="340" title="交互示例"></iframe>`。
- 卡片：`<div class="code-card" path="hello"><p>打开演示</p></div>`。
- 注释：`<div class="note">补充说明</div>`，Markdown 块前后留空行。
- 讲稿：`<aside class="speaker-notes">纯文本或 HTML 讲稿</aside>`，按 N 切换。

保留旧写法 `<div class="slideshow" name="demo">` 加多个 `#` 的兼容性，开头标签后与结束标签前留空行。可使用一个无属性的内部 `<div>` 包裹正文。多个 slideshow 会合并成一套连续翻页的幻灯片。块外内容放在展示页下方的补充资料折叠区。

HTML 是可信作者内容，不做安全沙箱。不要将来路不明的脚本直接嵌入。支持常规 HTML，不支持 React/JSX 或任意 MDX 执行。

## 风格与展示

默认宽屏浏览器自适应排版。当前没有 Tailwind 运行时，不假定 Tailwind 工具类有效。需要样式时在项目 `theme.css` 定义 CSS。每页只承载一个重点，建议一行结论配 2–4 个短要点，或一张主要图片/视频配少量文字。长段落、完整代码与背景资料放讲稿或拆成下一页。编译器对页面内容量设置上限并报告超限页；这是保守估算，还须在实际投影尺寸检查。幻灯片本身不显示纵向滚动条。

新课件先问用户是否要快捷键和自定义。默认**空格或右方向键下一页，左方向键上一页**；其他键默认不启用。所有快捷键可在项目根目录的 `slides.config.json` 配置：

```json
{
  "keyboard": {
    "next": ["Space", "ArrowRight", "ArrowDown"],
    "prev": ["ArrowLeft", "ArrowUp"],
    "first": ["Home"],
    "last": ["End"],
    "notes": ["KeyN"],
    "fullscreen": ["KeyF"]
  }
}
```

这里只需要填写要改的操作；未写的操作沿用默认（除 next/prev 外都是空数组）。完全关闭快捷键用 `{"keyboard":false}`。按键名使用浏览器的 `KeyboardEvent.code`：方向键、Space、PageUp/PageDown、Home/End、Enter、KeyA–KeyZ。同一按键不可分配给多个操作。下方按钮始终可用。焦点在输入框、链接和媒体控件内时不抢按键。支持 `deck.html#slide-3` 定位页面。打印显示全部页面与 fragment，默认不打印讲稿；打印不等于原生 PPTX 导出。

编辑时运行 `node <skill>/scripts/slides.mjs serve <project> --watch --port 8080`，在浏览器打开本地地址。保存 `slides/*.md`、assets、demos、`theme.css` 或配置后会重建并刷新，尽量停留在原页。编译失败时网页显示错误并保留上次可用版本。初次启动需有可成功构建的文稿；普通 `serve`、直接打开 HTML、已复制出去的 dist 不会监听源文件。

## 离线约定

多媒体统一写法、在线模式及详细限制见 [多媒体指南](multimedia.md)。项目默认离线，可通过 slides.config.json 显式开启在线；下述离线规则适用于默认模式。

生成的 HTML、CSS、公式字体和 Demo 在一个 dist 内，保留完整文件夹结构。图片、脚本、iframe、字体等展示资源必须本地化。编译检查 HTML/CSS/SVG 的静态资源引用并拒绝缺失文件、远程资源与越界路径。普通外部超链接允许存在。

检查不分析任意 JavaScript 中的 fetch、动态 URL、模块导入或 CSS 转义。Demo 必须另行审查与断网测试。对于需要服务器接口、ES module 或 fetch 本地文件的 Demo，使用 serve 而不是 file://；依赖远程服务的功能不能称为完全离线。
