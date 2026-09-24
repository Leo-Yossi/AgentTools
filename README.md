# AgentTools

个人 AI 工具项目集合。每个项目放在独立子文件夹中，自带代码、文档、示例和使用入口，可以单独维护和复用。

## 项目列表

| 子项目 | 用途 | 使用说明 |
|---|---|---|
| html-slides | 与 AI 逐页讨论内容，将 Markdown 编译为支持多媒体的 HTML 幻灯片 | [进入项目](html-slides/README.md) |
| research-methodology | 通用科研/技术调研方法论：想法 → 关键词 → 检索式 → 多源检索 → 调研报告 | [进入项目](research-methodology/README.md) |

```text
AgentTools/
  README.md
  html-slides/          Markdown 幻灯片项目
    README.md
    skills/html-slides/ Skill 与编译器
    examples/          可运行示例
    tools/             打包工具
  research-methodology/ 调研方法论项目
    README.md
    SKILL.md            Skill 入口与路由
    references/         方法论正文
    prompts/            提示词模板
    assets/             检索脚本与平台配置
    topics/             实跑样例
  <其他项目>/           后续独立工具项目
```

后续添加项目时，在根目录新建对应子文件夹，并在项目列表登记。各项目的依赖安装、测试和打包命令在各自目录中执行；具体课件、生成结果和临时文件不纳入版本管理。
