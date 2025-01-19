// 错误单词管理器
class WrongWordsManager {
  private storageKey = 'recite-wrong-words';

  constructor() {
    // 迁移旧数据
    this.migrateOldData();
  }

  private migrateOldData() {
    const oldData = localStorage.getItem('wrongWords');
    if (oldData) {
      try {
        const oldWrongWords = JSON.parse(oldData);
        const currentData = this.getWrongWordsMap();
        // 合并数据
        const mergedData = { ...currentData, ...oldWrongWords };
        this.saveWrongWordsMap(mergedData);
        // 删除旧数据
        localStorage.removeItem('wrongWords');
      } catch (error) {
        console.error('迁移旧数据失败:', error);
      }
    }
  }

  // 获取错误单词列表
  getWrongWords(owner: string): any[] {
    const wrongWordsMap = this.getWrongWordsMap();
    return wrongWordsMap[owner] || [];
  }

  // 添加错误单词
  addWrongWord(word: any, owner: string) {
    const wrongWordsMap = this.getWrongWordsMap();
    if (!wrongWordsMap[owner]) {
      wrongWordsMap[owner] = [];
    }

    // 检查单词是否已存在
    const existingWordIndex = wrongWordsMap[owner].findIndex(
      (w: any) => w.name === word.name
    );

    if (existingWordIndex === -1) {
      // 如果单词不存在，添加新单词，初始化 correctCount 为 0
      wrongWordsMap[owner].push({ ...word, correctCount: 0 });
    } else {
      // 如果单词已存在，将 correctCount 重置为 0
      wrongWordsMap[owner][existingWordIndex].correctCount = 0;
    }

    this.saveWrongWordsMap(wrongWordsMap);
  }

  // 更新单词的正确次数
  updateWordCorrectCount(owner: string, word: any, isCorrect: boolean) {
    const wrongWordsMap = this.getWrongWordsMap();
    if (!wrongWordsMap[owner]) return;

    const wordIndex = wrongWordsMap[owner].findIndex(
      (w: any) => w.name === word.name
    );

    if (wordIndex !== -1) {
      if (isCorrect) {
        // 答对时增加计数
        wrongWordsMap[owner][wordIndex].correctCount =
          (wrongWordsMap[owner][wordIndex].correctCount || 0) + 1;

        // 如果达到3次正确，从列表中移除
        if (wrongWordsMap[owner][wordIndex].correctCount >= 3) {
          wrongWordsMap[owner].splice(wordIndex, 1);
        }
      } else {
        // 答错时减少计数，但不低于0
        wrongWordsMap[owner][wordIndex].correctCount = Math.max(
          (wrongWordsMap[owner][wordIndex].correctCount || 0) - 1,
          0
        );
      }

      this.saveWrongWordsMap(wrongWordsMap);
    }
  }

  // 清空某个所有者的错误单词
  clearWrongWords(owner: string) {
    const wrongWordsMap = this.getWrongWordsMap();
    wrongWordsMap[owner] = [];
    this.saveWrongWordsMap(wrongWordsMap);
  }

  // 获取错误单词映射表
  private getWrongWordsMap(): { [key: string]: any[] } {
    const wrongWordsJson = localStorage.getItem(this.storageKey);
    return wrongWordsJson ? JSON.parse(wrongWordsJson) : {};
  }

  // 保存错误单词映射表
  private saveWrongWordsMap(wrongWordsMap: { [key: string]: any[] }) {
    localStorage.setItem(this.storageKey, JSON.stringify(wrongWordsMap));
  }
}

export const wrongWordsManager = new WrongWordsManager();
