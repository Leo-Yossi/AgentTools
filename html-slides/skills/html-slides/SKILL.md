---
name: html-slides
description: Discuss presentations page by page and compile Markdown into HTML slides with offline media, captions, PDFs, local demos and optional online embeds. Use for HTML/web slide authoring, multimedia integration and revision. Does not produce editable PowerPoint files.
---

# Markdown 到离线 HTML 幻灯片

把对话中确定的逐页内容保存为 Markdown，再用随包编译器生成可以离线展示的网页。工具代码留在本 skill，具体内容、图片、Demo 和成品留在独立项目中。

## 工作方式

了解主题、受众、目标、时长、已有素材和风格，优先从已有对话与文件获取。只询问会实质改变课件的缺失信息，不重复确认。默认沿用已有设计，新项目默认简洁教学风格。

制作每套新课件时，明确询问用户是否启用或自定义演示快捷键。推荐默认是空格/右方向键下一页、左方向键上一页；也可以完全关闭，或为上下方向键、Home/End、讲稿、全屏指定按键。用户已在当前对话中决定时沿用，不重复询问。把选择记在 `brief.md`；需要关闭或自定义时写 `slides.config.json`，详见[写作规范](references/authoring.md)。

先给出逐页草案，每页写清标题、核心信息、支持材料与展示方式。用户希望逐页讨论时按该节奏推进，把已达成共识的内容及时保存；如果已授权直接制作，就继续完成，不额外设置审批关卡。尚未确定的事实、数据或素材标为待补充，不编造。对页数或内容做明显调整前解释原因。

每页只讲一个核心意思。正文以一句观点和少量支撑内容为主；长解释、完整代码和引用移入讲稿或资料页。图片、图表或视频占主要画面时，旁边只留必要标签。构建会拒绝内容过密的页面，按提示精简或拆页，不通过缩小字体、隐藏内容或添加页内滚动条绕过。

项目内 `brief.md` 记录受众、目标、重要决定与未决问题；`slides/deck.md` 是实际投影内容的唯一来源。讲稿写在页面的 `speaker-notes` 中。需要更详细的讨论记录时另存 `outline.md`，不要把讨论过程混进投影片。后续修改优先改 Markdown，避免只改生成的 HTML。

每页围绕一个清晰目的安排内容。复杂交互放在项目 `demos/<name>/index.html`，图片放在 `assets/`。使用本地资源；外部网页链接可保留，但说明点击访问需要联网。新建或改造 Demo 时检查它自己的网络请求与字体依赖，静态资源检查不能证明任意 JavaScript 离线可用。

## 编译

本说明中的 `<skill>` 是此 SKILL.md 所在目录，`<project>` 是用户选定的独立课件目录，执行时替换成真实路径并引用有空格的路径。首次运行如依赖尚未安装，在 `<skill>` 执行 `npm ci`。需要 Node.js 18 或更新版本。随附依赖的便携包解压后可直接运行。

```text
node "<skill>/scripts/slides.mjs" init "<project>"
node "<skill>/scripts/slides.mjs" build "<project>"
node "<skill>/scripts/slides.mjs" serve "<project>" --port 8080
```

已有项目跳过 init。init 只接受空目录，build 只替换自己生成的 dist。源码和资源不可写进 skill。完整复制项目 `dist/` 即可交付，双击 `dist/index.html` 进入目录，也可使用本地预览。仅拷贝单个 HTML 会丢失字体、样式和 Demo。

制作或修改课件时运行 `serve`：Markdown、图片、Demo 或样式保存后自动重新构建，浏览器刷新并保留页码链接。首次启动需要已有可成功构建的文稿或上一次成功的 dist；构建失败会继续显示旧版并在网页中报错。`serve --no-watch` 只预览已有 dist；只用 `build` 或双击 HTML 时不会自动更新。

写 Markdown 前阅读 [写作规范](references/authoring.md)。排查编译、离线与布局问题时阅读 [验证说明](references/validation.md)。不要为每套课件复制或修改编译器；专属视觉调整放项目 `theme.css`。

涉及图片、音视频、字幕、网页、PDF、附件或复杂交互时，阅读 [多媒体选型与写法](references/multimedia.md)，优先使用 `media` 块。默认离线；远程内容准备本地封面或说明。用户确实需要联网展示时才设置项目 `slides.config.json` 的 `network` 为 `online`。不要承诺任意网站可嵌入，也不要把图表、3D、录屏、转码或原生 PPTX 编辑说成本工具已内置的能力。

## 检查与交付

构建后查看 `dist/manifest.json`，核对页数、顺序、标题、图片和 Demo。用浏览器检查目标展示尺寸下的每页排版，以及翻页、fragment、讲稿和交互。每页不应出现滚动条或溢出警示；若出现，修改 Markdown 精简或拆页并重新构建。编译成功不等于视觉验证通过。若浏览器不可用，明确披露未完成视觉检查。

交付 Markdown 和 `dist/index.html` 的路径，说明整目录可离线分享；只报告实际执行的验证。用户未要求时，不安装到全局、发布网站或导出 PPTX。
