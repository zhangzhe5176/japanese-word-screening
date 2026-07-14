# TASK_STATUS

## 线上运行错误修复（2026-07-14）

- 原因：`wordCard()` 调用了 `isKanaReading()` 和 `stripSourceMarkers()`，但新项目中缺少这两个函数。
- 修复：只补回两个纯词形判断辅助函数；没有引入正文、故事、音频、教材图片或其他旧项目运行代码。
- 其他遗漏检查：未发现其他被调用但未定义的项目辅助函数；新增 `site_smoke.cjs` 防回归断言。
- 本地真实 Chrome：页面显示、五等级、105 Topic、9,116 词卡、搜索、筛选、状态、重置和 XLSX 导出通过；DevTools 控制台 0 条消息。
- 当前阶段：待提交、推送并重新验收线上 Pages。

## 当前目标

创建并发布独立的“日语单词筛查”网站，原项目只读。

## 已完成

- 完成原项目规则、状态和单词筛查候选版的只读审计。
- 创建本项目目录并初始化独立 Git 仓库，当前分支为 `main`。
- 创建独立网站入口、数据加载器和项目规则文件。
- 从原项目只提取 N5～N1 词卡字段，生成五份独立数据文件；输出不含正文、故事、音频或教材图片字段。
- 数据校验通过：105 个 Topic、9,116 条词卡，禁止字段为 0。
- 入口、JavaScript 语法、XLSX 生成和本地 HTTP 服务检查通过。
- 已创建并推送 GitHub 仓库：<https://github.com/zhangzhe5176/japanese-word-screening>。
- GitHub Pages 已发布：<https://zhangzhe5176.github.io/japanese-word-screening/>。
- 线上首页、样式、运行脚本、数据加载器和五份数据均返回 `200`；线上数据仍为 105 个 Topic、9,116 条词卡。

## 进行中

- 无。

## 待完成

- 浏览器端完整点击回归可在后续使用真实浏览器手动体验；当前已完成脚本级入口、数据、状态模型和 XLSX 生成验证。

## 关键边界

- 原项目：`/Users/wise/Documents/图书电子化/language-library`，只读。
- 新项目：`/Users/wise/Documents/图书电子化/japanese-word-screening`。
