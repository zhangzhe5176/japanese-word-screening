#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index], process.argv[index + 1]);
}
const source = args.get("--source");
const output = args.get("--output");
const level = String(args.get("--level") || "").toLowerCase();
if (!source || !output || !/^n[1-5]$/.test(level)) {
  console.error("用法：node tools/extract_vocabulary.cjs --source /path/to/n5-data.js --output data/n5-vocabulary.js --level n5");
  process.exit(2);
}

const MANUAL_VOCAB_OVERRIDES = {
  "n5:t7:s60:v204": { reading: "エーティーエム", displayWord: "ATM", meaning: "自动取款机" },
  "n5:t20:s261:v757": { reading: "ティーシャツ", displayWord: "Tシャツ" },
  "n5:t20:s265:v757": { reading: "ティーシャツ", displayWord: "Tシャツ" },
  "n4:t10:s189:v755": { reading: "ティーシャツ", displayWord: "Tシャツ" },
  "n3:t12:s227:v1204": { reading: "じさ", displayWord: "時差", meaning: "时差" },
  "n3:t13:s256:v1359": { reading: "ひゃっかじてん", displayWord: "百科事典", meaning: "百科全书" },
  "n3:t13:s277:v1469": { reading: "かくれる", displayWord: "隠れる", pos: "动词·自动词" },
  "n3:t14:s283:v1501": { reading: "〜い", displayWord: "〜位", meaning: "第～名" },
  "n3:t14:s288:v1526": { reading: "ふく〜", displayWord: "副〜", meaning: "副～" },
  "n3:t14:s293:v1553": { reading: "むく", displayWord: "向く", meaning: "适合", pos: "动词·自动词" },
  "n3:t15:s305:v1605": { reading: "ふあんな", displayWord: "不安な", meaning: "不安的" },
  "n3:t15:s312:v1656": { reading: "つく", displayWord: "付く", pos: "动词·自动词" },
  "n3:t15:s314:v1669": { reading: "ふる", displayWord: "振る", pos: "动词·他动词" },
  "n3:t15:s317:v1689": { reading: "さます", displayWord: "覚ます", pos: "动词·他动词" },
  "n3:t15:s320:v1709": { reading: "〜しょう", displayWord: "〜証", meaning: "～证" },
  "n3:t16:s332:v1771": { reading: "ききめ", displayWord: "効き目" },
  "n3:t17:s348:v1848": { reading: "あき", displayWord: "空き", meaning: "空位" },
  "n3:t17:s350:v1864": { reading: "ささる", displayWord: "刺さる", meaning: "刺入", pos: "动词·自动词" },
  "n3:t18:s356:v1905": { reading: "ゆるやかな", displayWord: "緩やかな", meaning: "缓慢" },
  "n3:t18:s369:v2002": { reading: "へる", displayWord: "減る", meaning: "减少", pos: "动词·自动词" },
};

function normalize(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, "").trim();
}

function stripSourceMarkers(value) {
  return String(value ?? "").normalize("NFKC").replace(/[+＋=＝→←↑↓~〜～①②③④⑤⑥⑦⑧⑨⑩0-9?？（）()\[\]［］]/gu, "").trim();
}

function isKanaReading(value) {
  return /^[ぁ-ゖァ-ヺー・／/、\s]+$/u.test(String(value || ""));
}

function recoverReadingFromRaw(sourceWord, story) {
  if (!sourceWord || !/\p{Script=Han}/u.test(sourceWord)) return null;
  const sources = Array.isArray(story.vocabRaw) ? story.vocabRaw.map((value) => String(value || "")) : [];
  for (const sourceText of sources) {
    const compact = sourceText.replace(/\s+/gu, "").trim();
    const index = compact.indexOf(sourceWord);
    if (index < 0) continue;
    const prefix = compact.slice(0, index).match(/[ぁ-ゖァ-ヺー]{2,}$/u)?.[0] || "";
    const suffix = compact.slice(index + sourceWord.length).match(/^[ぁ-ゖァ-ヺー]{2,}$/u)?.[0] || "";
    const candidate = prefix || suffix;
    const exactPair = candidate && (compact === `${candidate}${sourceWord}` || compact === `${sourceWord}${candidate}`);
    if (exactPair && candidate.length >= Math.max(2, sourceWord.length - 1) && isKanaReading(candidate)) return candidate;
  }
  return null;
}

function resolveReading(sourceWord, sourceKana, story, manual) {
  if (manual?.reading) return { value: manual.reading, source: "manual-confirmation", review: false, reason: "" };
  if (sourceKana) return { value: sourceKana, source: "vocab[2]", review: false, reason: "" };
  const sourceReading = stripSourceMarkers(sourceWord);
  if (isKanaReading(sourceReading)) return { value: sourceReading, source: "sourceWord", review: false, reason: "" };
  const recovered = recoverReadingFromRaw(sourceWord, story);
  if (recovered) return { value: recovered, source: "vocabRaw", review: false, reason: "" };
  return { value: "", source: "", review: true, reason: `未找到可唯一确认的完整读音：${sourceWord}` };
}

const code = fs.readFileSync(source, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox, { filename: source });
const raw = sandbox.window.LEVEL_DATA || sandbox.window.N3_DATA;
if (!raw || !Array.isArray(raw.topics) || !Array.isArray(raw.stories)) throw new Error(`源文件没有可用的 ${level.toUpperCase()} 数据。`);

const topicCounts = new Map(raw.topics.map((topic) => [Number(topic.id), 0]));
const words = [];
const seenIds = new Set();
const topicEntrySequence = new Map();
for (const story of raw.stories) {
  const topicId = Number(story.topicId);
  for (const row of Array.isArray(story.vocab) ? story.vocab : []) {
    const topicEntryIndex = (topicEntrySequence.get(topicId) || 0) + 1;
    topicEntrySequence.set(topicId, topicEntryIndex);
    const sourceVocabNo = String(row?.[0] || "").trim();
    const sourceWord = String(row?.[1] || "").trim();
    const sourceKana = String(row?.[2] || "").trim();
    const recordIndex = words.length + 1;
    const id = `${level}:t${topicId}:w${recordIndex}`;
    const sourceId = `${level}:t${topicId}:s${String(story.id)}:v${sourceVocabNo}`;
    if (seenIds.has(id)) throw new Error(`发现重复词卡 ID：${id}`);
    seenIds.add(id);
    const manual = MANUAL_VOCAB_OVERRIDES[sourceId] || null;
    const reading = resolveReading(sourceWord, sourceKana, story, manual);
    const displayWord = manual?.displayWord ?? sourceWord;
    words.push({
      id,
      level,
      topicId,
      recordIndex,
      topicEntryIndex,
      sourceVocabNo,
      sourceWord,
      displayWord,
      kana: reading.value,
      readingSource: reading.source,
      readingReview: reading.review,
      readingReviewReason: reading.reason,
      canScan: Boolean(reading.value && !reading.review),
      kanji: /\p{Script=Han}/u.test(displayWord) ? displayWord : "",
      pos: manual?.pos ?? String(row?.[3] || "").trim(),
      meaning: manual?.meaning ?? String(row?.[4] || "").trim(),
      statusKey: `${level}:word:${normalize(sourceWord || reading.value)}`,
    });
    topicCounts.set(topicId, (topicCounts.get(topicId) || 0) + 1);
  }
}

const data = {
  schemaVersion: 1,
  level,
  label: raw.label || level.toUpperCase(),
  targetWordCount: words.length,
  topics: raw.topics.map((topic) => ({
    id: Number(topic.id),
    title: String(topic.title || ""),
    reading: String(topic.reading || ""),
    english: String(topic.english || ""),
    wordCount: topicCounts.get(Number(topic.id)) || 0,
  })),
  words,
};

const forbidden = /"(?:japanese|naturalChinese|originalChinese|audio|images|vocabRaw|ocrText|stories|story)"\s*:/;
if (forbidden.test(JSON.stringify(data))) throw new Error("输出数据包含被禁止的正文、故事或媒体字段。");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `window.WORD_SCREENING_DATA = ${JSON.stringify(data)};\n`);
console.log(`${level.toUpperCase()}: ${words.length} cards, ${data.topics.length} topics, ${words.filter((word) => word.readingReview).length} reading-review records -> ${output}`);
