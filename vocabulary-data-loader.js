(() => {
  "use strict";

  const LEVELS = ["n5", "n4", "n3", "n2", "n1"];
  const DATA_BASE = window.VOCABULARY_DATA_BASE || "./data";

  function loadScript(level) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${DATA_BASE}/${level}-vocabulary.js`;
      script.async = false;
      script.onload = () => {
        const data = window.WORD_SCREENING_DATA;
        if (!data || data.level !== level || !Array.isArray(data.topics) || !Array.isArray(data.words)) {
          reject(new Error(`无法读取 ${level.toUpperCase()} 单词数据结构。`));
          return;
        }
        resolve(data);
        delete window.WORD_SCREENING_DATA;
        script.remove();
      };
      script.onerror = () => reject(new Error(`无法加载 ${level.toUpperCase()} 单词数据。`));
      document.head.appendChild(script);
    });
  }

  window.loadVocabularyPrototypeData = async () => {
    const data = {};
    for (const level of LEVELS) data[level] = await loadScript(level);
    return data;
  };
})();
