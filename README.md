# 日语单词筛查

独立的日语 N5～N1 单词筛查网站。

保留内容：

- N5～N1 五个等级
- 105 个 Topic
- 9,116 条词卡记录，保留原始 Topic 顺序和重复记录
- 会 / 模糊 / 不会学习状态
- 搜索、状态筛选、Topic/等级重置
- 当前 Topic 或当前等级范围的 Excel 导出

不包含正文、故事、音频和教材图片。学习状态保存在当前浏览器的 `localStorage` 中，不上传云端。

## 本地运行

```bash
python3 -m http.server 4174
```

打开 <http://127.0.0.1:4174/>。

## 数据来源与重建

`data/*-vocabulary.js` 是从原项目的 N5～N1 数据中只提取词卡字段后生成的独立数据副本。原项目仅作为读取源，未被本项目的构建脚本写入。

```bash
node tools/extract_vocabulary.cjs --source /path/to/n5-data.js --output data/n5-vocabulary.js --level n5
```
