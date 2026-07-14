#!/usr/bin/env node

const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
for (const required of ["vocabulary-data-loader.js", "app.js", "styles.css", "vocabularyPrototypeApp"]) {
  if (!index.includes(required)) throw new Error(`入口缺少 ${required}`);
}
const appSource = fs.readFileSync("app.js", "utf8");
for (const forbidden of ["stories", "vocabRaw", "ocrText", "originalChinese", "naturalChinese", "audio", "images"]) {
  if (appSource.includes(forbidden)) throw new Error(`运行代码仍引用被禁止字段：${forbidden}`);
}
for (const helper of ["stripSourceMarkers", "isKanaReading"]) {
  if (!new RegExp(`function\\s+${helper}\\s*\\(`).test(appSource)) throw new Error(`缺少词卡渲染辅助函数：${helper}`);
}

const fakeApp = { innerHTML: "" };
const context = {
  window: { loadVocabularyPrototypeData: () => new Promise(() => {}) },
  document: { querySelector: () => fakeApp },
  Blob,
  TextEncoder,
  DataView,
  Uint8Array,
  Promise,
  setTimeout,
  clearTimeout,
  console,
};
vm.runInNewContext(appSource, context, { filename: "app.js" });
const blob = context.window.__vocabularyPrototype.createXlsxBlob([["Topic", "词条编号", "假名", "日语汉字", "词性", "中文释义"], ["Topic 1", "1", "かな", "漢字", "名", "中文"]]);
if (blob.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") throw new Error("XLSX MIME 类型错误。");
blob.arrayBuffer().then((buffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("XLSX 文件不是有效 ZIP 容器。");
  const text = new TextDecoder().decode(bytes);
  if (!text.includes("中文释义")) throw new Error("XLSX 未包含表头。");
  console.log("SITE SMOKE: entry, forbidden-reference scan, and XLSX generation passed");
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
