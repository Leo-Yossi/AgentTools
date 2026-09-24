# 多媒体选型与写法

调研与实现更新：2026-09-24。这里的“幻灯片”是 HTML 演示，不能等同于 PowerPoint 原生文件或插件容器。

## 能力范围

| 需求 | 本框架做法 | 当前边界 |
|---|---|---|
| PNG/JPEG/WebP/AVIF/SVG | Markdown 图片，或 image 媒体块 | image 支持放大、替代文本与说明；格式取决于浏览器 |
| GIF、动画 WebP | image 媒体块 | 浏览器直接播放，无统一暂停；要可控动画可改视频 |
| 本地视频、录屏 | video 媒体块 | 支持进度、音量、静音、循环、封面、片段、字幕；不负责录屏和转码 |
| 音频、旁白、音效 | audio 媒体块 | 默认手动播放，离页暂停；未实现跨页连续背景音乐或旁白时间线 |
| 在线视频 | web 媒体块使用服务商嵌入 URL | 需项目启用在线模式；不把普通视频详情页当播放器地址 |
| 本地网页、小游戏、算法动画 | web 媒体块指向 demos/name/index.html | 本地依赖一起打包；离页卸载，返回重置状态 |
| 网站、地图、仪表盘、表单 | web + 官方 embed URL | 对方须允许嵌入；登录、Cookie、权限和网络均影响使用 |
| PDF | pdf 媒体块 | 依赖浏览器 PDF 查看器，始终提供单独打开链接；可加 #page=2 |
| Word、Excel、PPTX、ZIP | file 附件块 | 浏览器不原生编辑这些文件；内嵌展示先转成 PDF、图片或 HTML |
| 流程图、关系图 | 已导出的本地 SVG/PNG | 没有内置 Mermaid 编译；按需在独立 Demo 中带本地渲染库 |
| 交互图表 | 本地 Demo | 可接 Chart.js/ECharts 等，库与数据一起放项目；不是内置图表编辑器 |
| 3D、全景、Lottie、WebGL | 本地 Demo | 按项目接入模型/动画库；模型、纹理、解码器需本地化，未随工具内置 |
| 摄像头、麦克风、实时接口 | 定制 Demo | 需要浏览器授权/适当运行环境，非默认能力，需单独评估 |
| 分步动画 | fragment | 支持逐步出现；未实现 PowerPoint Morph、复杂对象动画时间轴 |
| Flash、ActiveX、OLE、宏 | 不支持 | 迁移为视频、HTML 或附件，不声称兼容旧插件 |

微软的多媒体工作流覆盖 GIF、视频、录屏与字幕等；本框架重点覆盖展示与嵌入，录制和剪辑使用外部工具完成。[Microsoft 多媒体概览](https://support.microsoft.com/en-us/powerpoint/training/add-format-and-record-video-in-powerpoint)

## 统一媒体块

在 Markdown 中使用语言标记为 `media` 的 JSON 代码块。它会渲染为媒体，不会显示成代码。字段名拼错、时间范围错误会直接报错。

````markdown
```media
{
  "type": "video",
  "src": "assets/demo.mp4",
  "title": "操作演示",
  "poster": "assets/poster.jpg",
  "start": 5,
  "end": 25,
  "muted": true,
  "autoplay": false,
  "tracks": [{"src":"assets/zh.vtt","lang":"zh","label":"中文字幕","default":true}],
  "caption": "这里展示操作的关键步骤。"
}
```
````

通用字段：`type`、`src`，可选 `title`、`caption`、`fallback`。资源相对 dist 根目录，空格编码为 `%20`。

- image：可选 `zoom`（默认 true）、`fit`（contain/cover）。
- video/audio：可选 `autoplay`、`muted`、`loop`、`start`、`end`（秒）、`tracks`。视频可选 `poster`。
- start/end 是播放器的片段控制，并不剪辑源文件；停止时间受浏览器 timeupdate 事件频率影响，不适合逐帧精确剪辑。
- web/pdf：可选 `height`（100–1200 像素，默认 440）、`poster`。仍受视口高度约束。
- file：呈现明确的附件链接。

其他写法：

````markdown
```media
{"type":"audio","src":"assets/narration.mp3","title":"讲解录音"}
```

```media
{"type":"image","src":"assets/chart.svg","title":"销售额趋势","caption":"单位：万元；数据来源见讲稿。"}
```

```media
{"type":"web","src":"demos/simulator/index.html","title":"交互模拟","height":440}
```

```media
{"type":"pdf","src":"assets/report.pdf#page=2","title":"报告第二页"}
```

```media
{"type":"file","src":"assets/data.xlsx","title":"原始数据"}
```
````

原生 HTML 的 video/audio/iframe/source/track/object 仍可使用。media 块额外提供回退说明、默认控件与编译信息。资源检查覆盖字幕、封面、object.data、iframe.srcdoc 中静态引用以及延迟 iframe 地址；srcset 暂不支持。

## 离线与在线

默认离线。远程媒体块必须提供本地 poster 或 fallback；离线构建只输出它们及原链接，不输出远程播放器或 iframe。

````markdown
```media
{"type":"web","src":"https://example.com/","title":"网站演示","poster":"assets/site-preview.png","fallback":"离线时展示截图。需要实际操作时打开原网站。"}
```
````

需要实际嵌入时，在项目根目录创建 `slides.config.json`：

```json
{"network":"online"}
```

在线网页进入页面后仍需点“加载在线内容”；本地网页进入当前页时加载。离开即卸载 iframe，避免后台声音与持续运算。回到页面后重新开始，需要保留状态的 Demo 应自行保存到本地存储。原生 video/audio 保留播放位置，但离页会暂停。

不要把“编译成功”当作网站嵌入成功。X-Frame-Options/CSP、跨域、登录和服务商政策都可能拒绝 iframe。跨域限制也让父页面无法可靠识别所有拒绝情况，所以始终保留回退与独立打开入口。[MDN 嵌入边界](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/General_embedding_technologies)、[iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)

使用 YouTube 等服务时从服务商取得正式 embed URL，保留它要求的来源标识；普通 watch 链接不能直接替代 embed 地址。本工具没有内置服务商播放器 API，不承诺从父页面精确控制在线播放器进度。[YouTube 官方嵌入 API](https://developers.google.com/youtube/iframe_api_reference)

## 播放与编码

视频可优先准备 H.264/AAC 的 MP4，并在实际目标浏览器试播。文件扩展名不能保证编码兼容。大文件按需要缩小分辨率或压缩，保留清晰度和授权来源；工具不会自动替你转码。

浏览器可能阻止有声自动播放，`autoplay:true` 只表示尝试，失败会提示点播放。默认手动播放；设置静音也不是在所有环境下都保证自动播放。[MDN 自动播放指南](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

字幕采用 UTF-8 WebVTT，建议与视频同源，使用 serve 预览。单个 HTML 文件双击的 file:// 环境可能限制字幕、模块或本地 fetch。[MDN track](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track)

服务器已提供媒体 MIME、Content-Length、HEAD 与单段 Range（206/416），大文件按流输出，避免一次性读入内存。这支持浏览器拖动进度；多段 Range 暂回完整文件。[MDN Range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests)

## 复杂交互扩展

图表、3D、流程图等按项目接到本地 Demo：

- 图表：随 Demo 带 Chart.js 的本地脚本与数据。[官方接入说明](https://www.chartjs.org/docs/latest/getting-started/integration)
- Mermaid：预先导出 SVG，或在 Demo 中打包本地 Mermaid；目前普通 mermaid 代码块不会自动变图。[官方用法](https://mermaid.js.org/config/usage)
- 3D：使用 model-viewer 等展示 GLB/glTF，核对贴图和解码器是否还有外网 URL。[官方加载说明](https://modelviewer.dev/examples/loading/)

父页面在 iframe 加载后发送 `{type:'html-slides',event:'enter',slide:页号}`。Demo 如接收消息，应检查 `event.source === parent`，HTTP 环境还应校验预期 origin。框架不执行来自 iframe 的翻页命令。父页面也发出 `slidechange` DOM 事件，detail 含从零计数的 index/previous，可供自己写的插件使用。[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

## 交付检查

1. 查 `dist/media-report.json` 的运行模式、远程地址、素材清单与大小；`manifest.json` 记录各文稿的媒体块。
2. 用 serve 试播音视频，拖动进度，切换字幕；切页后确认无声音残留。
3. 点击本地 Demo，确认输入不会触发翻页；返回后核对重置行为。
4. 在线模式验证真正的目标网站，不以示例网站测试代替；离线模式禁止外网后检查替代内容。
5. 检查 PDF 查看器和附件，点击图片放大，测试键盘关闭。
6. 打印/PDF 是静态产物，不能保留音视频和交互。重要内容应有封面、文字概述或截图。

静态扫描不分析任意 JavaScript、动态模块、接口、编码兼容性和所有 CSS 语法。HTML/Demo 是可信作者代码，没有执行安全沙箱；第三方不可信程序不能直接视为安全素材。
