<template>
  <div class="recite-container">
    <div class="header">
      <el-button
        @click="$emit('restart')"
        class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <div
      v-if="!isFinished"
      class="recite-card">
      <div class="progress">
        <div class="progress-text">
          {{ currentIndex + 1 }} / {{ totalWords }}
        </div>
        <div class="progress-wrapper">
          <el-progress
            :percentage="progressPercentage"
            :format="() => ''"
            :stroke-width="10" />
        </div>
      </div>

      <div class="word-meaning">
        {{ currentWord.description }}
        <el-icon
          class="speak-icon"
          :class="{ speaking: isSpeaking }"
          @click="speakWord">
          <Microphone />
        </el-icon>
      </div>

      <el-input
        v-model="userInput"
        placeholder="请输入英文单词"
        @keyup.enter="checkAnswer"
        :disabled="showResult">
        <template #append>
          <el-button
            @click="checkAnswer"
            :disabled="showResult">
            确认
          </el-button>
        </template>
      </el-input>

      <div
        v-if="showResult"
        class="result-message">
        <div :class="isCorrect ? 'correct' : 'incorrect'">
          {{ isCorrect ? '正确!' : '错误!' }}
          <div
            v-if="!isCorrect"
            class="correct-answer">
            正确答案: {{ currentWord.name }}
          </div>
        </div>
        <el-button
          type="primary"
          @click="nextWord"
          class="next-btn">
          {{ isLastWord ? '结束' : '下一个' }}
        </el-button>
      </div>
    </div>

    <div
      v-else
      class="summary">
      <h2>背诵完成!</h2>
      <div class="stats">
        <div>总单词数: {{ totalWords }}</div>
        <div>正确数: {{ correctCount }}</div>
        <div>错误数: {{ wrongCount }}</div>
        <div>正确率: {{ ((correctCount / totalWords) * 100).toFixed(1) }}%</div>
      </div>

      <div
        v-if="wrongWords.length"
        class="wrong-words">
        <h3>错误单词列表：</h3>
        <el-table
          :data="wrongWords"
          style="width: 100%">
          <el-table-column
            prop="name"
            label="英文" />
          <el-table-column
            prop="description"
            label="中文" />
          <el-table-column
            prop="userInput"
            label="你的答案" />
        </el-table>
      </div>

      <el-button
        type="primary"
        @click="$emit('restart')"
        class="restart-btn">
        重新开始
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { wrongWordsManager } from '../utils/wrongWords.ts';
import { getTTSAudio } from '../utils/tts';
// 按需导入图标
import { ArrowLeft, Microphone } from '@element-plus/icons-vue';

const props = defineProps<{
  words: {
    name: string;
    description: string;
    owner: string;
    type?: string;
  }[];
  mode?: 'normal' | 'wrong-words';
}>();

const emit = defineEmits(['restart', 'updateWrongWords']);

// 状态变量
const currentIndex = ref(0);
const userInput = ref('');
const showResult = ref(false);
const isCorrect = ref(false);
const wrongAnswers = ref(new Set<number>());
// 添加用户输入记录
const userInputHistory = ref<string[]>([]);

// 计算属性
const totalWords = computed(() => props.words.length);
const currentWord = computed(() => props.words[currentIndex.value]);
const isFinished = computed(() => currentIndex.value >= totalWords.value);
const correctCount = computed(() => totalWords.value - wrongAnswers.value.size);
const wrongCount = computed(() => wrongAnswers.value.size);

// 添加是否是最后一个单词的计算属性
const isLastWord = computed(() => {
  return currentIndex.value === totalWords.value - 1;
});

// 修改进度百分比的计算属性
const progressPercentage = computed(() => {
  // 如果是第一个单词，显示0%
  if (currentIndex.value === 0) return 0;
  // 如果是最后一个单词，显示100%
  if (currentIndex.value === totalWords.value - 1) return 100;
  // 其他情况，计算实际进度
  return Math.floor((currentIndex.value / (totalWords.value - 1)) * 100);
});

// 错误单词列表
const wrongWords = computed(() => {
  const words: any[] = [];
  wrongAnswers.value.forEach((index) => {
    words.push({
      name: props.words[index].name,
      description: props.words[index].description,
      userInput: userInputHistory.value[index] || '',
    });
  });
  return words;
});

// 检查答案
const checkAnswer = () => {
  if (!userInput.value.trim()) {
    ElMessage.warning('请输入单词');
    return;
  }

  // 记录用户输入
  userInputHistory.value[currentIndex.value] = userInput.value.trim();

  isCorrect.value =
    userInput.value.trim().toLowerCase() ===
    currentWord.value.name.toLowerCase();

  if (!isCorrect.value) {
    wrongAnswers.value.add(currentIndex.value);
    // 添加到错误单词本，确保只在非错误单词本模式下添加
    if (props.mode !== 'wrong-words') {
      wrongWordsManager.addWrongWord(
        {
          name: currentWord.value.name,
          description: currentWord.value.description,
          owner: currentWord.value.owner,
        },
        currentWord.value.owner
      );
      // 发出更新错误单词列表的事件
      emit('updateWrongWords');
    }
  } else {
    // 保存进度到 localStorage
    const progress = JSON.parse(localStorage.getItem('wordProgress') || '{}');
    const wordKey = `${currentWord.value.owner}-${currentWord.value.name}`;
    progress[wordKey] = (progress[wordKey] || 0) + 1;
    localStorage.setItem('wordProgress', JSON.stringify(progress));
  }

  showResult.value = true;
};

// 下一个单词
const nextWord = () => {
  currentIndex.value++;
  userInput.value = '';
  showResult.value = false;
};

// 添加朗读状态
const isSpeaking = ref(false);

// 添加朗读函数
const speakWord = async () => {
  if (isSpeaking.value) return;

  try {
    isSpeaking.value = true;
    const word = currentWord.value.name;

    // 获取已加载好的音频元素
    const audioElement = await getTTSAudio(word);

    // 确保只有一个 onended 处理器
    audioElement.onended = () => {
      isSpeaking.value = false;
      audioElement.onended = null;
    };

    // 在 iOS 上，需要用户交互才能播放音频
    try {
      await audioElement.play();
    } catch (playError) {
      console.error('播放错误:', playError);
      isSpeaking.value = false;
      ElMessage.error('播放失败，请重试');
    }
  } catch (error) {
    console.error('朗读错误:', error);
    isSpeaking.value = false;
    ElMessage.error('朗读失败，请稍后重试');
  }
};
</script>

<style scoped>
/* PC端基础样式 */
.recite-container {
  padding: 40px 0;
}

.recite-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header {
  margin-bottom: 30px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  width: auto;
}

.word-meaning {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  gap: 10px;
}

.speak-icon {
  font-size: 36px;
  color: #409eff;
  cursor: pointer;
  padding: 12px;
  transition: all 0.3s ease;
  border-radius: 50%;
  background-color: #ecf5ff;
}

.speak-icon:hover {
  transform: scale(1.1);
  background-color: #d9ecff;
}

.speak-icon.speaking {
  animation: pulse 1.5s infinite;
  background-color: #d9ecff;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.result-message {
  margin-top: 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.correct {
  color: #67c23a;
  font-size: 20px;
}

.incorrect {
  color: #f56c6c;
  font-size: 20px;
}

.correct-answer {
  margin-top: 10px;
  font-size: 18px;
}

.next-btn {
  width: 200px;
}

.summary {
  width: 100%;
  min-height: 100%;
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  gap: 20px;
}

.summary h2 {
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.stats {
  margin: 20px 0;
  font-size: 18px;
  line-height: 1.8;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.restart-btn {
  width: 100%;
  height: 44px;
  margin-top: 20px;
}

.wrong-words {
  margin: 20px 0;
  width: 100%;
}

.wrong-words h3 {
  margin-bottom: 16px;
  color: #f56c6c;
  font-size: 18px;
  text-align: left;
}

/* 修改进度条相关样式 */
.progress {
  display: block;
  margin-bottom: 30px;
  font-size: 16px;
}

.progress-text {
  text-align: center;
  margin-bottom: 10px;
}

.progress-wrapper {
  width: 100%;
}

:deep(.el-progress) {
  display: block;
  width: 100%;
}

:deep(.el-progress-bar) {
  width: 100%;
}

:deep(.el-progress-bar__outer) {
  background-color: #ebeef5;
}

:deep(.el-progress-bar__inner) {
  transition: width 0.3s ease;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .recite-container {
    padding: 15px;
  }

  .recite-card {
    border-radius: 8px;
  }

  .header {
    margin-bottom: 15px;
  }

  .word-meaning {
    font-size: 28px;
    margin: 20px 0;
  }

  .result-message {
    gap: 15px;
    margin-top: 15px;
  }

  .next-btn {
    width: 100%;
    height: 40px;
  }

  /* 输入框样式优化 */
  :deep(.el-input__wrapper) {
    padding: 0 15px;
  }

  :deep(.el-input__inner) {
    height: 40px;
    font-size: 16px;
  }

  :deep(.el-input-group__append button) {
    height: 40px;
    padding: 0 20px;
  }

  /* 进度条样式优化 */
  .progress {
    margin-bottom: 10px;
    font-size: 14px;
    color: #666;
  }

  :deep(.el-progress-bar__outer) {
    border-radius: 4px;
    height: 6px !important;
    width: 100% !important; /* 确保移动端也是100%宽度 */
  }

  .summary {
    padding: 15px;
    border-radius: 8px;
  }

  .stats {
    margin: 20px 0;
    font-size: 16px;
    line-height: 1.6;
  }

  .wrong-words {
    margin: 20px 0;
  }

  .wrong-words h3 {
    margin-bottom: 15px;
    font-size: 16px;
  }

  .restart-btn {
    width: 100%;
    margin-top: 20px;
  }
}

@media (max-width: 430px) {
  .summary {
    padding: 20px 16px;
    border-radius: 0;
    box-shadow: none;
  }

  .stats {
    font-size: 16px;
  }
}
</style>
