#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const expected = { n5: { topics: 24, words: 1136 }, n4: { topics: 13, words: 1035 }, n3: { topics: 18, words: 2014 }, n2: { topics: 23, words: 2360 }, n1: { topics: 27, words: 2571 } };
const forbidden = new Set(["japanese", "naturalChinese", "originalChinese", "audio", "images", "vocabRaw", "ocrText", "stories", "story"]);
const violations = [];

function inspect(value, location) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) violations.push(`${location}.${key}`);
    inspect(child, `${location}.${key}`);
  }
}

let totalWords = 0;
let totalTopics = 0;
for (const level of Object.keys(expected)) {
  const file = path.join(__dirname, "..", "data", `${level}-vocabulary.js`);
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  const data = sandbox.window.WORD_SCREENING_DATA;
  if (!data || data.level !== level) throw new Error(`${level}: 数据未加载。`);
  inspect(data, level);
  const actual = { topics: data.topics.length, words: data.words.length };
  if (actual.topics !== expected[level].topics || actual.words !== expected[level].words) {
    throw new Error(`${level}: 期望 ${JSON.stringify(expected[level])}，实际 ${JSON.stringify(actual)}。`);
  }
  if (data.topics.some((topic) => topic.wordCount !== data.words.filter((word) => word.topicId === topic.id).length)) {
    throw new Error(`${level}: Topic 词数与词卡记录不一致。`);
  }
  totalWords += actual.words;
  totalTopics += actual.topics;
  console.log(`${level.toUpperCase()}: ${actual.topics} topics, ${actual.words} cards`);
}
if (violations.length) throw new Error(`发现禁止字段：${violations.join(", ")}`);
if (totalTopics !== 105 || totalWords !== 9116) throw new Error(`总计错误：${totalTopics} topics, ${totalWords} cards`);
console.log(`TOTAL: ${totalTopics} topics, ${totalWords} cards; forbidden fields: 0`);
