// 定义单词数据的类型
export interface WordItem {
  name: string;
  description: string;
  type?: string;
  owner?: string;
}

export interface SentenceData {
  sentence: string;
  description: string;
  type?: string;
}

export interface BaseUnit {
  name: string;
  description: string;
  type: 'unit' | 'sentence' | 'wrong-words';
  owner: string;
  words: any[];
  stars?: WordItem[];
}

export interface WordUnit extends BaseUnit {
  type: 'unit';
  words: WordItem[];
  stars?: WordItem[];
}

export interface SentenceUnit extends BaseUnit {
  type: 'sentence';
  words: {
    type: string;
    data: SentenceData[];
  }[];
}

export interface WrongWordsUnit extends BaseUnit {
  type: 'wrong-words';
  words: WordItem[];
}

export type Unit = WordUnit | SentenceUnit | WrongWordsUnit;

// 使用 Record 类型来定义 wordData 的类型
export type WordData = Record<string, Unit[]>;

// 定义进度数据类型
export interface WordProgress {
  [key: string]: number;
}

// 定义学习统计数据类型
export interface LearningStats {
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
}
