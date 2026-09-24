# 多媒体示例

图片、动图、视频、音频、网页和文档可以与 Markdown 内容放在同一套演示中。

本套使用本地测试素材。外部网页在离线模式下显示替代说明。

---

# 图片与放大查看

```media
{"type":"image","src":"assets/diagram.svg","title":"原项目示意图","caption":"点击图片或聚焦后按 Enter 放大。"}
```

---

# 动图

```media
{"type":"image","src":"assets/motion.gif","title":"动态测试画面","caption":"GIF 会循环播放；需要暂停与进度控制时使用视频。"}
```

---

# 视频、字幕与片段

```media
{"type":"video","src":"assets/sample.mp4","title":"四秒测试视频","start":1,"end":3,"muted":true,"tracks":[{"src":"assets/zh.vtt","lang":"zh","label":"中文","default":true}],"caption":"点击播放。只播放第 1–3 秒；离开本页会暂停。"}
```

---

# 音频

```media
{"type":"audio","src":"assets/sample.wav","title":"低音量测试音","caption":"三秒测试音。使用播放器控制音量和进度。"}
```

---

# 本地交互网页

```media
{"type":"web","src":"demos/counter/index.html","title":"计数器","height":360,"caption":"点击 +1。离开页面会卸载网页，返回后重新开始。"}
```

---

# 外部网页的离线替代

```media
{"type":"web","src":"https://example.com/","title":"外部网页示例","poster":"assets/diagram.svg","fallback":"当前为离线展示。此处使用示意图占位，可替换为已获授权的网页截图。"}
```

---

# PDF 文档

```media
{"type":"pdf","src":"assets/sample.pdf","title":"示例文档","height":440,"caption":"PDF 查看器由浏览器提供；不支持内嵌查看时可单独打开。"}
```

---

# 附件

```media
{"type":"file","src":"assets/notes.txt","title":"补充资料","fallback":"需要详细资料时打开附件。"}
```
