# 多媒体示例

9 页演示覆盖图片放大、GIF、视频、WebVTT 字幕、播放片段、音频、本地网页、远程网页的离线替代、PDF 和附件。

从 AgentTools/html-slides 子项目目录执行：

```sh
node skills/html-slides/scripts/slides.mjs build examples/media-gallery
node skills/html-slides/scripts/slides.mjs serve examples/media-gallery --port 8080
```

默认离线，网页示例显示本地替代内容。需要实际联网测试时，可在本目录创建 slides.config.json，内容为 `{"network":"online"}`。具体网站是否能嵌入仍需验证。

视频、GIF、提示音和 PDF 是功能测试素材，不是正式课程内容。离开嵌入网页所在页面会卸载它，返回后重新初始化。
