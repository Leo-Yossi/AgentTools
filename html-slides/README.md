# HTML Slides

AgentTools 中的独立 Markdown 幻灯片子项目。包含可复用 Skill、编译器、示例和打包工具，可单独复制使用。

## 工具目录

| 工具 | 用途 | 入口 |
|---|---|---|
| html-slides | 与 AI 逐页讨论演示内容，将 Markdown 编译为离线 HTML 幻灯片，支持多媒体与可选在线网页 | [SKILL.md](skills/html-slides/SKILL.md) |

## 仓库结构

```text
skills/
  html-slides/       Skill、编译器、样式、测试与参考文档
examples/
  media-gallery/     可运行的多媒体示例及本地素材
tools/
  package_skill.py   生成源码包与含依赖的便携包
```

具体课程、汇报文稿等放在工具目录之外。其他无关工具应放在 AgentTools 的其他子项目目录中。

## html-slides 快速开始

需要 Node.js 18 或更新版本。首次安装依赖需要联网，此后默认可离线编译与展示。先进入 AgentTools/html-slides，再运行：

```sh
npm --prefix skills/html-slides ci
node skills/html-slides/scripts/slides.mjs build examples/media-gallery
node skills/html-slides/scripts/slides.mjs serve examples/media-gallery --port 8080
```

浏览器打开 <http://127.0.0.1:8080/> 查看示例。音视频、字幕和 PDF 推荐通过这个本地服务器预览。

创建自己的演示项目：

```sh
node skills/html-slides/scripts/slides.mjs init ../../my-talk
node skills/html-slides/scripts/slides.mjs build ../../my-talk
node skills/html-slides/scripts/slides.mjs serve ../../my-talk --port 8081
```

修改 `../../my-talk/slides/deck.md` 后重新 build。分享时复制项目完整的 dist 目录，保留字体、样式、图片和 Demo。

## 与 AI 配合

让 AI 阅读 `skills/html-slides/SKILL.md`，说明主题、受众、时长和目标项目路径，逐页讨论并保存 Markdown，再编译和检查。整个 html-slides 文件夹也可以单独复制使用；它不依赖仓库里的示例项目。

目前直接支持图片放大、GIF、音视频、字幕、片段播放、嵌入网页、PDF 和附件。离开页面后音视频暂停，iframe 卸载。图表、3D 等通过独立本地 Demo 扩展，对应库没有内置。

- [Markdown 写作规范](skills/html-slides/references/authoring.md)
- [多媒体支持范围、写法与官方资料](skills/html-slides/references/multimedia.md)
- [验证与排错](skills/html-slides/references/validation.md)

默认离线。项目根目录可添加 `slides.config.json`，以 `{"network":"online"}` 开启在线嵌入。外部网站仍可能禁止嵌入，因此保留替代说明及单独打开链接。该工具生成 HTML，不生成可编辑 PPTX。

## 测试与打包

```sh
npm --prefix skills/html-slides test
python tools/package_skill.py
```

打包需要 Python 3，仅使用标准库，并要求 skill 依赖已安装。releases 目录生成源码版和便携版 ZIP；便携版包含依赖，但仍需要 Node.js。node_modules、构建结果、ZIP 和临时文件不进入 Git。

## 示例素材

多媒体示例中的视频、GIF 和提示音是合成测试素材，PDF 为本地测试文档，示意图及计数器沿用本项目原始示例。实际课件使用的第三方内容应保留其来源和许可；npm 依赖遵循各自许可证。
