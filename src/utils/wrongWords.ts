interface WrongWord {
  name: string;
  description: string;
  correctCount: number;
  owner: string;
}

interface WrongWordsStorage {
  [owner: string]: WrongWord[];
}

const STORAGE_KEY = 'recite-wrong-words';

export const wrongWordsManager = {
  // 获取某个用户的错误单词
  getWrongWords(owner: string): WrongWord[] {
    const storage = localStorage.getItem(STORAGE_KEY);
    if (!storage) return [];
    const allWrongWords = JSON.parse(storage) as WrongWordsStorage;
    return allWrongWords[owner] || [];
  },

  // 添加错误单词
  addWrongWord(
    word: { name: string; description: string; owner: string },
    owner: string
  ) {
    const storage = localStorage.getItem(STORAGE_KEY);
    const allWrongWords: WrongWordsStorage = storage ? JSON.parse(storage) : {};

    if (!allWrongWords[owner]) {
      allWrongWords[owner] = [];
    }

    // 检查是否已存在
    const existingWord = allWrongWords[owner].find((w) => w.name === word.name);
    if (!existingWord) {
      allWrongWords[owner].push({
        name: word.name,
        description: word.description,
        correctCount: 0,
        owner,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allWrongWords));
    }
  },

  // 更新单词正确次数
  updateWordCorrectCount(word: WrongWord, owner: string) {
    const storage = localStorage.getItem(STORAGE_KEY);
    if (!storage) return;

    const allWrongWords = JSON.parse(storage) as WrongWordsStorage;
    if (!allWrongWords[owner]) return;

    const wordIndex = allWrongWords[owner].findIndex(
      (w) => w.name === word.name
    );

    if (wordIndex !== -1) {
      allWrongWords[owner][wordIndex].correctCount++;

      // 如果答对5次，则移除该单词
      if (allWrongWords[owner][wordIndex].correctCount >= 5) {
        allWrongWords[owner].splice(wordIndex, 1);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allWrongWords));
    }
  },

  // 添加清空指定用户的错误单词方法
  clearWrongWords(owner: string) {
    const storage = localStorage.getItem(STORAGE_KEY);
    if (!storage) return;

    const allWrongWords = JSON.parse(storage) as WrongWordsStorage;
    allWrongWords[owner] = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allWrongWords));
  },
};
